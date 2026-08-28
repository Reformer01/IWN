<?php 
// Enable error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/form_submissions.log');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: X-Requested-With, Content-Type');
    header('Content-Type: application/json');
    http_response_code(200);
    echo json_encode(['status' => true, 'message' => 'OK']);
    exit;
}

// Set headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: X-Requested-With, Content-Type');
header('Content-Type: application/json');

require_once "mailer.php";

// Initialize response array
$data = [
    'status' => false,
    'message' => '',
    'debug' => []
];

// Log function for better debugging
function mapLeadState($state) {
    $s = strtolower(trim((string)$state));
    if ($s === '') {
        return $state;
    }
    if (strpos($s, 'oyo') !== false || strpos($s, 'ibadan') !== false) return 'Oyo';
    if (strpos($s, 'osun') !== false || strpos($s, 'osogbo') !== false || strpos($s, 'ilesa') !== false) return 'Osun';
    if (strpos($s, 'ondo') !== false || strpos($s, 'akure') !== false) return 'Ondo';
    if (strpos($s, 'lagos') !== false) return 'Lagos';
    if (strpos($s, 'sagamu') !== false) return 'Sagamu';
    if (strpos($s, 'ijebu') !== false) return 'Ijebu';
    if (strpos($s, 'mowe') !== false || strpos($s, 'ibafo') !== false) return 'Mowe';
    if (strpos($s, 'ogun') !== false || strpos($s, 'abeokuta') !== false) return 'Ogun';
    return trim($state);
}

function logDebug($message, $data = null) {
    $log = '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n";
    if ($data !== null) {
        $log .= 'Data: ' . print_r($data, true) . "\n";
    }
    error_log($log, 3, __DIR__ . '/form_submissions.log');
}

// --- SECURITY CONFIGURATION ---
define('RATE_LIMIT_MAX', 10);           // Max submissions per IP per hour
define('RATE_LIMIT_WINDOW', 3600);       // 1 hour in seconds
define('TIMING_MIN_SECONDS', 3);         // Minimum time to fill form (seconds)
define('BLOCK_THRESHOLD', 5);           // Failed reCAPTCHA attempts before block
define('BLOCK_DURATION', 86400);        // Block duration in seconds (24 hours)

// Get client IP (handle proxies)
function getClientIP() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    // Check for forwarded IP from Cloudflare/proxy
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    }
    return filter_var($ip, FILTER_VALIDATE_IP) ?: '0.0.0.0';
}

// File-based rate limiting and blocking (works without database)
function getSecurityFilePath($ip, $type = 'rate') {
    $hash = md5($ip);
    return __DIR__ . '/security_' . $type . '_' . substr($hash, 0, 8) . '.json';
}

// Check if IP is blocked
function isIPBlocked($ip) {
    $blockFile = getSecurityFilePath($ip, 'block');
    if (file_exists($blockFile)) {
        $blockData = json_decode(file_get_contents($blockFile), true);
        if ($blockData && isset($blockData['blocked_until']) && time() < $blockData['blocked_until']) {
            return $blockData['blocked_until'] - time();
        }
        // Block expired, remove file
        @unlink($blockFile);
    }
    return false;
}

// Record failed reCAPTCHA attempt
function recordFailedRecaptcha($ip) {
    $failFile = getSecurityFilePath($ip, 'fail');
    $failData = ['count' => 0, 'first_fail' => time(), 'last_fail' => time()];
    
    if (file_exists($failFile)) {
        $failData = json_decode(file_get_contents($failFile), true) ?: $failData;
        // Reset if older than 24 hours
        if (time() - $failData['first_fail'] > 86400) {
            $failData = ['count' => 0, 'first_fail' => time(), 'last_fail' => time()];
        }
    }
    
    $failData['count']++;
    $failData['last_fail'] = time();
    file_put_contents($failFile, json_encode($failData));
    
    // Check if should block
    if ($failData['count'] >= BLOCK_THRESHOLD) {
        $blockFile = getSecurityFilePath($ip, 'block');
        $blockData = [
            'blocked_until' => time() + BLOCK_DURATION,
            'reason' => 'Too many failed reCAPTCHA attempts',
            'fail_count' => $failData['count']
        ];
        file_put_contents($blockFile, json_encode($blockData));
        logDebug('IP BLOCKED for excessive failed reCAPTCHA', ['ip' => $ip, 'fail_count' => $failData['count']]);
        return true;
    }
    return false;
}

// Check rate limit
function checkRateLimit($ip) {
    $rateFile = getSecurityFilePath($ip, 'rate');
    $rateData = ['submissions' => [], 'count' => 0];
    
    if (file_exists($rateFile)) {
        $rateData = json_decode(file_get_contents($rateFile), true) ?: $rateData;
    }
    
    $now = time();
    // Clean old submissions outside the window
    $rateData['submissions'] = array_filter($rateData['submissions'], function($time) use ($now) {
        return ($now - $time) <= RATE_LIMIT_WINDOW;
    });
    
    $rateData['count'] = count($rateData['submissions']);
    return $rateData;
}

// Record a submission
function recordSubmission($ip) {
    $rateFile = getSecurityFilePath($ip, 'rate');
    $rateData = checkRateLimit($ip);
    $rateData['submissions'][] = time();
    $rateData['count'] = count($rateData['submissions']);
    file_put_contents($rateFile, json_encode($rateData));
}

// Log the incoming request
$clientIP = getClientIP();
if (empty($_POST['full_name']) && !empty($_POST['fullname'])) {
    $_POST['full_name'] = $_POST['fullname'];
}
if (empty($_POST['internet_type']) && !empty($_POST['internetType'])) {
    $_POST['internet_type'] = $_POST['internetType'];
}
if (!empty($_POST['state'])) {
    $_POST['state'] = mapLeadState($_POST['state']);
}

logDebug('=== NEW FORM SUBMISSION ===', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'ip' => $clientIP,
    'post_data_keys' => array_keys($_POST),
    'files' => !empty($_FILES) ? array_keys($_FILES) : []
]);

// --- CHECK IF IP IS BLOCKED ---
$blockedTime = isIPBlocked($clientIP);
if ($blockedTime) {
    logDebug('Blocked IP attempted submission', ['ip' => $clientIP, 'remaining' => $blockedTime . 's']);
    $data['status'] = false;
    $data['message'] = 'Your IP has been temporarily blocked due to suspicious activity. Please try again later.';
    echo json_encode($data);
    exit;
}

// --- RATE LIMITING CHECK ---
$rateData = checkRateLimit($clientIP);
if ($rateData['count'] >= RATE_LIMIT_MAX) {
    logDebug('Rate limit exceeded', ['ip' => $clientIP, 'count' => $rateData['count'], 'limit' => RATE_LIMIT_MAX]);
    $data['status'] = false;
    $data['message'] = 'Too many submissions. Please wait an hour before trying again.';
    echo json_encode($data);
    exit;
}

// Simple duplicate submission prevention using session
session_start();
$submissionKey = md5(serialize($_POST) . serialize($_FILES));
if (isset($_SESSION['last_submission']) && $_SESSION['last_submission'] === $submissionKey) {
    logDebug('Duplicate submission detected and blocked', ['submission_key' => $submissionKey]);
    $data['status'] = false;
    $data['message'] = 'Duplicate submission detected. Your application was already received.';
    echo json_encode($data);
    exit;
}
$_SESSION['last_submission'] = $submissionKey;

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // --- ANTI-SPAM CHECK (Honeypot & Timing) ---
    $isSpam = false;
    $spamReason = '';
    
    // Check honeypot fields
    if (!empty($_POST['middle_name']) || !empty($_POST['website_url'])) {
        $isSpam = true;
        $spamReason = 'honeypot';
        logDebug('Spam detected via honeypot', [
            'middle_name' => $_POST['middle_name'] ?? '',
            'website_url' => $_POST['website_url'] ?? ''
        ]);
    }
    
    // Check submission timing (bots fill forms too fast)
    $formToken = isset($_POST['form_token']) ? (int)$_POST['form_token'] : 0;
    $currentTime = time();
    if ($formToken > 0 && ($currentTime - $formToken < TIMING_MIN_SECONDS)) {
        $isSpam = true;
        $spamReason = 'timing';
        logDebug('Spam detected via timing', [
            'elapsed_seconds' => $currentTime - $formToken,
            'token' => $formToken,
            'minimum' => TIMING_MIN_SECONDS
        ]);
    }
    
    // If spam, silently reject (return success to trick bot)
    if ($isSpam) {
        $data['status'] = true; // Trick the bot
        $data['message'] = 'Your request has been received. An agent will reach out to you.';
        echo json_encode($data);
        exit;
    }
    // --- END ANTI-SPAM CHECK ---

    // Get form subject to check if this is excluded from reCAPTCHA
    $formSubject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
    $adsLeadSubjects = ['Google Ads Lead', 'Facebook Ads Lead', 'LinkedIn Ads Lead'];
    $isAdsLead = in_array($formSubject, $adsLeadSubjects, true);
    $isCareerApplication = ($formSubject === 'Career Application');
    
    // --- reCAPTCHA VERIFICATION (MANDATORY for non-excluded forms) ---
    if (!$isAdsLead && !$isCareerApplication) {
        $recaptchaToken = isset($_POST['g-recaptcha-response']) ? $_POST['g-recaptcha-response'] : '';
        
        // Require reCAPTCHA token - reject if missing
        if (empty($recaptchaToken)) {
            logDebug('reCAPTCHA token missing - rejecting submission', ['ip' => $clientIP]);
            recordFailedRecaptcha($clientIP);
            $data['status'] = false;
            $data['message'] = 'Security verification required. Please complete the captcha and try again.';
            echo json_encode($data);
            exit;
        }
        
        // Verify token with Google
        $secretKey = '6LfqtsAsAAAAAOQjyONu0V38RORZ_GfUn7-8pfij';
        $verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
        
        $verifyData = [
            'secret' => $secretKey,
            'response' => $recaptchaToken,
            'remoteip' => $clientIP
        ];
        
        $ch = curl_init($verifyUrl . '?' . http_build_query($verifyData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $verifyResponse = curl_exec($ch);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        $responseData = json_decode($verifyResponse, true);
        
        logDebug('reCAPTCHA verification response', [
            'ip' => $clientIP,
            'success' => $responseData['success'] ?? false,
            'score' => $responseData['score'] ?? 'N/A',
            'curl_error' => $curlError
        ]);
        
        // Check if verification was successful
        if (!$responseData || !isset($responseData['success']) || $responseData['success'] !== true) {
            logDebug('reCAPTCHA verification failed', ['ip' => $clientIP, 'response' => $responseData]);
            $blocked = recordFailedRecaptcha($clientIP);
            $data['status'] = false;
            if ($blocked) {
                $data['message'] = 'Your IP has been blocked due to multiple failed security checks.';
            } else {
                $data['message'] = 'Security verification failed. Please try again.';
            }
            echo json_encode($data);
            exit;
        }
        
        logDebug('reCAPTCHA verification successful', ['ip' => $clientIP]);
    } else {
        logDebug('Skipping reCAPTCHA for ads lead or Career Application form', ['ip' => $clientIP, 'subject' => $formSubject]);
    }
    // --- END reCAPTCHA VERIFICATION ---

    // Record successful submission for rate limiting
    recordSubmission($clientIP);

    $fields = $_POST;
    $uploads = $_FILES;
    $content = $files = array();
    
    // Helper function to recursively handle nested arrays
    function formatValue($value, $prefix = '') {
        if (is_array($value)) {
            // Check if it's an associative array with meaningful keys
            $formatted = [];
            foreach ($value as $k => $v) {
                $formatted[] = formatValue($v, $prefix . $k . ': ');
            }
            return implode("\n", $formatted);
        }
        return $prefix . htmlspecialchars($value);
    }

    // Iterate over input fields
    foreach ($fields as $field => $value) {
        // Skip honeypot, internal fields, and reCAPTCHA response
        if (in_array($field, ['middle_name', 'website_url', 'form_token', 'subject', 'g-recaptcha-response'])) {
            continue;
        }

        // Replace underscores with spaces and capitalize first letters
        $fieldName = ucwords(str_replace('_', ' ', $field));

        // Handle nested arrays properly
        $formattedValue = formatValue($value);

        $content[] = array(
            'label' => $fieldName,
            'value' => $formattedValue
        );
    }

    // Iterate over uploaded files if found
    if (!empty($uploads)) {
        foreach ($uploads as $upload) {
            if ($upload['error'] === UPLOAD_ERR_OK) {
                $file_tmp  = $upload['tmp_name'];
                $file_name = $upload['name'];

                // You may want to add file type checking here
                $files[] = array(
                    'file' => $file_tmp,
                    'name' => htmlspecialchars($file_name) // Sanitize output
                );
            } else {
                $data['status'] = false;
                $data['message'] = "File upload error: " . $upload['error'];
                echo json_encode($data);
                exit;
            }
        }
    }
      // Define form configurations with full sales team routing
      $adsStateRouting = [
          'Ogun' => [
              'to' => 'titilade.bakare@iworldnetworks.net',
              'cc' => ['henry.adiene@iworldnetworks.net', 'reformer.ejembi@iworldnetworks.net']
          ],
          'Oyo' => [
              'to' => 'jeffery.udoji@iworldnetworks.net',
              'cc' => ['titilade.bakare@iworldnetworks.net', 'reformer.ejembi@iworldnetworks.net']
          ],
          'Lagos' => [
              'to' => 'titilade.bakare@iworldnetworks.net',
              'cc' => ['jeffery.udoji@iworldnetworks.net', 'reformer.ejembi@iworldnetworks.net']
          ],
          'Osun' => [
              'to' => 'emmanuel.oladimeji@iworldnetworks.net',
              'cc' => ['elizabeth.tola@iworldnetworks.net', 'reformer.ejembi@iworldnetworks.net']
          ],
          'Ondo' => [
              'to' => 'ruth.suleimon@iworldnetworks.net',
              'cc' => ['emmanuel.oladimeji@iworldnetworks.net', 'reformer.ejembi@iworldnetworks.net']
          ],
          'Sagamu' => [
              'to' => 'janet.oke@iworldnetworks.net',
              'cc' => ['reformer.ejembi@iworldnetworks.net']
          ],
          'Ijebu' => [
              'to' => 'janet.oke@iworldnetworks.net',
              'cc' => ['reformer.ejembi@iworldnetworks.net']
          ],
          'Mowe' => [
              'to' => 'janet.oke@iworldnetworks.net',
              'cc' => ['reformer.ejembi@iworldnetworks.net']
          ],
          'Ota' => [
              'to' => 'janet.oke@iworldnetworks.net',
              'cc' => ['reformer.ejembi@iworldnetworks.net']
          ],
          'Agbara' => [
              'to' => 'janet.oke@iworldnetworks.net',
              'cc' => ['reformer.ejembi@iworldnetworks.net']
          ]
      ];

      $formConfigs = [
          'Career Application' => [
              'to' => 'hr.iworldnetworks@gmail.com',
          ],
          'NGFEP Enquiry' => [
              'to' => 'hr.iworldnetworks@gmail.com',

          ],
          'Google Workspace Enquiry' => [
              'to' => 'jude.alawode@iworldnetworks.net',
               'cc' => [
                   'kolade.adegelu@iworldnetworks.net'
               ]
           ],
           'Google Ads Lead' => [
              'to' => 'reformer.ejembi@iworldnetworks.net',
              'cc' => [],
              'state_routing' => $adsStateRouting
          ],
          'Facebook Ads Lead' => [
              'to' => 'reformer.ejembi@iworldnetworks.net',
              'cc' => [],
              'state_routing' => $adsStateRouting
          ],
          'LinkedIn Ads Lead' => [
              'to' => 'reformer.ejembi@iworldnetworks.net',
              'cc' => [],
              'state_routing' => $adsStateRouting
          ]
      ];

      // Get and validate subject
      $subject = isset($_POST['subject']) ? trim(htmlspecialchars($_POST['subject'])) : '';
      
      // Log the subject for debugging
      logDebug('Processing form with subject: ' . $subject);
      
      // Initialize email variables with safe defaults
      $to = '';
      $cc = [];
      
      // Find matching configuration
      if (isset($formConfigs[$subject])) {
          $config = $formConfigs[$subject];
          $to = $config['to'];
          $cc = isset($config['cc']) ? $config['cc'] : [];
          
          // Check for state-based sub-routing
          if (isset($config['state_routing']) && !empty($_POST['state'])) {
              $state = trim($_POST['state']);
              if (isset($config['state_routing'][$state])) {
                  $stateConfig = $config['state_routing'][$state];
                  $to = $stateConfig['to'];
                  $cc = isset($stateConfig['cc']) ? $stateConfig['cc'] : [];
                  logDebug('State-based routing applied', [
                      'state' => $state,
                      'routed_to' => $to,
                      'routed_cc' => $cc
                  ]);
              } else {
                  logDebug('State not found in routing config, using default', ['state' => $state]);
              }
          }
          
          logDebug('Found matching configuration', [
              'subject' => $subject,
              'to' => $to,
              'cc' => $cc
          ]);
      } else {
          $to = 'adegelukolade@gmail.com';
          $cc = [
          'titilade.bakare@iworldnetworks.net',
               'reformer.ejembi@iworldnetworks.net',
              'emmanuel.oladimeji@iworldnetworks.net',
              'kolade.adegelu@iworldnetworks.net',
              'janet.oke@iworldnetworks.net',
              'sales@iworldnetworks.net'
          ];

          logDebug('Falling back to default routing', [
              'subject' => $subject,
              'to' => $to,
              'cc' => $cc
          ]);
      }
    // Log routing decision
    logDebug('Email routing decision', [
        'subject' => $subject,
        'to' => $to,
        'cc' => $cc
    ]);
    
    // --- LEAD ENGINE WEBHOOK (Google / Facebook / LinkedIn Ads) ---
    $adsLeadSubjects = ['Google Ads Lead', 'Facebook Ads Lead', 'LinkedIn Ads Lead'];
    if (in_array($subject, $adsLeadSubjects, true)) {
        // Replace with the v2 Lead Engine Web App URL after deploying InboundWebhook.gs
        $webhookUrl = 'https://script.google.com/macros/s/AKfycbwkIwlN8C4DfsZROyusnc8QoUGulqsGUsr3Bjnxrj5k684EOe2oCVCeo15vfIorGndG/exec'; 

        if (!empty($webhookUrl) && strpos($webhookUrl, 'script.google.com') !== false) {
            $postData = [
                'timestamp' => date('Y-m-d H:i:s'),
                'name' => isset($_POST['full_name']) ? $_POST['full_name'] : '',
                'email' => isset($_POST['email']) ? $_POST['email'] : '',
                'phone' => isset($_POST['phone']) ? $_POST['phone'] : '',
                'state' => isset($_POST['state']) ? $_POST['state'] : '',
                'internet_type' => isset($_POST['internet_type']) ? $_POST['internet_type'] : '',
                'address' => isset($_POST['address']) ? $_POST['address'] : '',
                'source' => $subject,
                'subject' => $subject,
                'timeline' => isset($_POST['timeline']) ? $_POST['timeline'] : (isset($_POST['decisionStage']) ? $_POST['decisionStage'] : ''),
                'scale' => isset($_POST['scale']) ? $_POST['scale'] : '',
                'preferred' => isset($_POST['preferred']) ? $_POST['preferred'] : ''
            ];

            $ch = curl_init($webhookUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json'
            ]);
            // Use standard timeout to prevent PHP crashes on Windows
            curl_setopt($ch, CURLOPT_TIMEOUT, 5); 
            $webhookResponse = curl_exec($ch);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            logDebug('Lead Engine webhook triggered', [
                'url' => $webhookUrl,
                'subject' => $subject,
                'response' => $webhookResponse,
                'error' => $curlError
            ]);
        } else {
            logDebug('Google Sheets Webhook Skipped: Invalid URL', ['url' => $webhookUrl]);
        }
    }
    // --- END GOOGLE SHEETS WEBHOOK ---
    
    try {
        // Generate email body
        $body = mailbody($subject, $content);
        
        // Log email details before sending
        logDebug('Preparing to send email', [
            'to' => $to,
            'cc' => $cc,
            'subject' => $subject,
            'has_files' => !empty($files)
        ]);
        
        // Send email
        $response = sendMail($to, $cc, $subject, $body, $files);
        
        // Log the response
        logDebug('Email send response', ['response' => $response]);
        
        if ($response === 'success') {
            $data['status'] = true;
            
            // Custom success messages based on form type
            if ($subject === 'Career Application') {
                $data['message'] = 'Your job application has been received successfully! We will review your application and get back to you shortly.';
            } else {
                $data['message'] = 'Your request has been received. An agent will reach out to you.';
            }
            
            logDebug('Email sent successfully');
        } else {
            throw new Exception('Failed to send email. Server response: ' . $response);
        }
        
    } catch (Exception $e) {
        $errorMsg = 'Error sending email: ' . $e->getMessage();
        logDebug($errorMsg, ['trace' => $e->getTraceAsString()]);
        $data['status'] = false;
        $data['message'] = 'There was an error processing your request. Please try again later.';
    }
} else {
    $data['status'] = false;
    $data['message'] = "Invalid Request method";
}

// Ensure we always output valid JSON
$output = json_encode($data);
if ($output === false) {
    // If json_encode fails, output a safe fallback
    $output = json_encode(['status' => false, 'message' => 'Internal server error: JSON encoding failed']);
}
echo $output;
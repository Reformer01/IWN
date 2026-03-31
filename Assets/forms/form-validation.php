<?php 
// Enable error reporting and logging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/form_submissions.log');

// Set headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header("Access-Control-Allow-Headers: X-Requested-With");
header('Content-Type: application/json');

require_once "mailer.php";

// Initialize response array
$data = [
    'status' => false,
    'message' => '',
    'debug' => []
];

// Log function for better debugging
function logDebug($message, $data = null) {
    $log = '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n";
    if ($data !== null) {
        $log .= 'Data: ' . print_r($data, true) . "\n";
    }
    error_log($log, 3, __DIR__ . '/form_submissions.log');
}

// Log the incoming request
logDebug('=== NEW FORM SUBMISSION ===', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'post_data' => $_POST,
    'files' => !empty($_FILES) ? array_keys($_FILES) : []
]);

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
    
    // Check honeypot fields
    if (!empty($_POST['middle_name']) || !empty($_POST['website_url'])) {
        $isSpam = true;
        logDebug('Spam detected via honeypot', [
            'middle_name' => $_POST['middle_name'] ?? '',
            'website_url' => $_POST['website_url'] ?? ''
        ]);
    }
    
    // Check submission timing (disabled due to client/server clock drift causing false positives)
    /*
    $formToken = isset($_POST['form_token']) ? (int)$_POST['form_token'] : 0;
    $currentTime = time();
    if ($formToken > 0 && ($currentTime - $formToken < 3)) {
        $isSpam = true;
        logDebug('Spam detected via timing', [
            'elapsed_seconds' => $currentTime - $formToken,
            'token' => $formToken
        ]);
    }
    */
    
    // If spam, silently reject (return success to trick bot)
    if ($isSpam) {
        $data['status'] = true; // Trick the bot
        $data['message'] = 'Your request has been received. An agent will reach out to you.';
        echo json_encode($data);
        exit;
    }
    // --- END ANTI-SPAM CHECK ---

    $fields = $_POST;
    $uploads = $_FILES;
    $content = $files = array();
    
    // Iterate over input fields
    foreach ($fields as $field => $value) {
        // Skip honeypot and internal fields
        if (in_array($field, ['middle_name', 'website_url', 'form_token', 'subject'])) {
            continue;
        }
        
        // Replace underscores with spaces and capitalize first letters
        $field = ucwords(str_replace('_', ' ', $field));
        // Separate multiple values by commas or just append
        $value = is_array($value) ? implode(', ', $value) : $value;
        
        $content[] = array(
            'label' => $field, 
            'value' => htmlspecialchars($value) // Sanitize output
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
      // Define form configurations
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
                  'kikachukwu.omordia@iworldnetworks.net',
                  'kolade.adegelu@iworldnetworks.net'
              ]
          ],
          'Google Ads Lead' => [
              'to' => 'jeffery.udoji@iworldnetworks.net',
              'cc' => [
                  'reformer.ejembi@iworldnetworks.net'
              ],
              'state_routing' => [
                  'Ogun' => [
                      'to' => 'jeffery.udoji@iworldnetworks.net',
                      'cc' => ['reformer.ejembi@iworldnetworks.net']
                  ],
                  'Oyo' => [
                      'to' => 'jeffery.udoji@iworldnetworks.net',
                      'cc' => ['reformer.ejembi@iworldnetworks.net']
                  ],
                  'Osun' => [
                      'to' => 'jeffery.udoji@iworldnetworks.net',
                      'cc' => ['reformer.ejembi@iworldnetworks.net']
                  ],
                  'Ondo' => [
                      'to' => 'jeffery.udoji@iworldnetworks.net',
                      'cc' => ['reformer.ejembi@iworldnetworks.net']
                  ]
              ]
          ]
      ];

      // TEST CONFIGURATION - Override for testing
      $formConfigs['Career Application']['to'] = 'hr.iworldnetworks@gmail.com'; // Replace with your test email

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
              'kikachukwu.omordia@iworldnetworks.net',
              'jeffery.udoji@iworldnetworks.net',
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
    
    // --- GOOGLE SHEETS WEBHOOK (Google Ads Leads Only) ---
    if ($subject === 'Google Ads Lead') {
        // NOTE: The user must replace this URL with their active deployed Google Apps Script Web App URL
        $webhookUrl = 'https://script.google.com/macros/s/AKfycbwkIwlN8C4DfsZROyusnc8QoUGulqsGUsr3Bjnxrj5k684EOe2oCVCeo15vfIorGndG/exec'; 

        if (!empty($webhookUrl) && strpos($webhookUrl, 'script.google.com') !== false) {
            $postData = [
                'timestamp' => date('Y-m-d H:i:s'),
                'name' => isset($_POST['full_name']) ? $_POST['full_name'] : '',
                'email' => isset($_POST['email']) ? $_POST['email'] : '',
                'phone' => isset($_POST['phone']) ? $_POST['phone'] : '',
                'state' => isset($_POST['state']) ? $_POST['state'] : '',
                'internet_type' => isset($_POST['internet_type']) ? $_POST['internet_type'] : '',
                'address' => isset($_POST['address']) ? $_POST['address'] : ''
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
            
            logDebug('Google Sheets Webhook Triggered', [
                'url' => $webhookUrl,
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

echo json_encode($data);
?>
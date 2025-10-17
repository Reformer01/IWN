<?php 
// Comment out the next 3 lines in production
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header("Access-Control-Allow-Headers: X-Requested-With");

require_once "mailer.php";

$data = array();

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $fields = $_POST;
    $uploads = $_FILES;
    $content = $files = array();
    
    // Iterate over input fields
    foreach ($fields as $field => $value) {
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
      // Determine recipient based on subject
      $to = "";
      $subject = htmlspecialchars($_POST['subject']);
      $cc = array();

      if ($subject == "Career Application") {
          $to = "reformer.ejembi@iworldnetworks.net";
      }
      else if ($subject == "Nigeria Google For Education Program Enquiry") {
          $to = "hr.iworldnetworks@gmail.com";
      }
      else if ($subject == "Google Workspace Enquiry") {
          $to = "jude.alawode@iworldnetworks.net";
          $cc = array(
              "kikachukwu.omordia@iworldnetworks.net",
              "kolade.adegelu@iworldnetworks.net"
          );
      }
      else {
          $to = "adegelukolade@gmail.com";
          $cc = array(
              "titilade.bakare@iworldnetworks.net",
              "kikachukwu.omordia@iworldnetworks.net", 
              "jeffery.udoji@iworldnetworks.net",
              "fisayo.adeboye@iworldnetworks.net",
              "reformer.ejembi@iworldnetworks.net",
              "emmanuel.oladimeji@iworldnetworks.net",
              "kolade.adegelu@iworldnetworks.net",
              "janet.oke@iworldnetworks.net",
              "sales@iworldnetworks.net"
          );

      };
    $body = mailbody($subject, $content);
    $response = sendMail($to, $cc, $subject, $body, $files);
    
    if ($response == 'success') {
        $data['status'] = true; // Change to true for success
        $data['message'] = "Your request has been received. An agent will reach out to you.";
    } else {
        $data['status'] = false;
        $data['message'] = "Error sending email: " . $response; // Provide error details
    }
} else {
    $data['status'] = false;
    $data['message'] = "Invalid Request method";
}

echo json_encode($data);
?>
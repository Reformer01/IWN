<?php 
// Comment out the next 3 lines in production
// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Methods: POST');
// header("Access-Control-Allow-Headers: X-Requested-With");

require_once "mailer.php";

$data = array();

if($_SERVER['REQUEST_METHOD'] == 'POST'){
        
    $fields = $_POST;
    $uploads = $_FILES;
    $content = $files = array();
    
    // Interate over input fields
    foreach($fields as $field => $value){
        
        // Replace underscore with space and capitalize first letters
        $field = ucwords(str_replace('_', ' ', $field));
        // Seperate multiple values by comma or just append
        $value = is_array($value) ? implode(', ', $value) : $value;

        $content[] = array(
            'label' => $field, 
            'value' => $value
        );
        
    }

    // Iterate over uploaded files if found
    if (!empty($uploads)) {
        foreach($uploads as $upload){

            $file_tmp  = $upload['tmp_name'];
            $file_name = $upload['name'];
            
            $files[] = array(
                'file' => $file_tmp,
                'name' => $file_name
            );
        }
        
    }
    
    $to = "sales@iworldnetworks.net";
    $subject = $_POST['subject'];
    
    $body = mailbody($subject, $content);
    $response = sendMail($to, $subject, $body, $files);
    
    if ($response == 'success') {
        $data['status'] = true;
        $data['message'] = "Your request has been received. An agent will reach out to you.";
    } else {
        $data['status'] = false;
        $data['message'] = $response;
    }

}else{
    $data['status'] = false;
    $data['message'] = "Invalid Request method";
}

echo json_encode($data);
?>
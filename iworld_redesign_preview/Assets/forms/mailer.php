<?php
include "config.php";
require_once "vendor/autoload.php";

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

function sendMail($to, $cc, $subject, $body, $attachments = array()){

    $mail = new PHPMailer(true);

    try {
        //Server settings
        $mail->SMTPDebug = SMTP::DEBUG_OFF;                   //Enable verbose debug output
        $mail->isSMTP();                                      //Send using SMTP
        $mail->Host       = 'iwn.ng';                          //Set the SMTP server to send through
        $mail->SMTPAuth   = true;                             //Enable SMTP authentication
        $mail->Username = MAIL_USERNAME;                 
        $mail->Password = MAIL_PASSWORD;                           
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;      //Enable implicit TLS encryption
        $mail->Port       = 465;                              //TCP port to connect to; use 587 if you have set `SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS`


        //Recipients
        $mail->setFrom(MAIL_USERNAME, TITLE);
        $mail->addAddress($to);                                 // Add primary recipient

        // Add CC recipients if provided
        if (!empty($cc)) {
            if (is_array($cc)) {
                foreach ($cc as $ccEmail) {
                    if (!empty($ccEmail)) {
                        $mail->addCC($ccEmail);
                    }
                }
            } elseif (is_string($cc)) {
                $mail->addCC($cc);
            }
        }

        //Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $body;

        //Add attachments
        if (!empty($attachments)) {
            foreach($attachments as $attachment){
                $mail->AddAttachment($attachment['file'], $attachment['name']);
            }
        }

        $mail->send();
        return 'success';
    } catch (Exception $e) {
        return "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
    }

  }

  function mailbody($subject, $body){
    $content = '                       
                <!doctype html>
                <html lang="en-US">

                <head>
                    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
                    <title>'. $subject .'</title>
                    <meta name="description" content="Contact email">
                </head>
                <style>
                    
                    a:hover {
                        text-decoration: underline !important;
                    }
                    
                </style>

                <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
                    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8" style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: "Open Sans", sans-serif;">
                        <tr>
                            <td>
                                <table style="background-color: #f2f3f8; max-width:670px; margin:0 auto;" width="100%" border="0"
                                    align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                    <!-- Logo -->
                                    <tr>
                                        <td style="text-align:center;">
                                        <a href="https://iwn.ng" title="logo" target="_blank">
                                            <img width="50%" src="https://iwn.ng/Assets/icons/logos/iworld_logo2.jpg" title="i-world Networks Logo" alt="i-world Networks Logo">
                                        </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <!-- Email Content -->
                                    <tr>
                                        <td>
                                            <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                                style="
                                                    max-width:670px; 
                                                    background:#fff; 
                                                    border-radius:3px;
                                                    -webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);
                                                    -moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);
                                                    box-shadow:0 6px 18px 0 rgba(0,0,0,.06);
                                                    padding:0 40px;
                                                ">
                                                <tr>
                                                    <td style="height:20px;">&nbsp;</td>
                                                </tr>
                                                <!-- Title -->
                                                <tr>
                                                    <td style="padding:0 15px; text-align: center;">
                                                        <h1 style="
                                                        color:#1e1e2d; 
                                                        font-weight:400; 
                                                        margin:0;
                                                        font-size:32px;
                                                        font-family:"Rubik", sans-serif;
                                                        font-weight: 500;
                                                        ">'. $subject .'</h1>
                                                        <hr style="
                                                            border: 0; 
                                                            height: 2px; 
                                                            margin-top: 15px;
                                                            margin-bottom: 24px;
                                                            background-image: -webkit-linear-gradient(left, #f0f0f0, #ff6600, #f0f0f0);
                                                            background-image: -moz-linear-gradient(left, #f0f0f0, #ff6600, #f0f0f0);
                                                            background-image: -ms-linear-gradient(left, #f0f0f0, #ff6600, #f0f0f0);
                                                            background-image: -o-linear-gradient(left, #f0f0f0, #ff6600, #f0f0f0);
                                                        ">
                                                    </td>
                                                </tr>
                                                <!-- Details Table -->
                                                <tr>
                                                    <td>
                                                        <table cellpadding="0" cellspacing="0"
                                                            style="width: 100%; border: 1px solid #ededed">
                                                            <tbody>';

                                                            // Ensure body variable has values, loop through label and value and insert into table
                                                            if (!empty($body) && is_array($body)) {
                                                                foreach ($body as $key) {
                                                                    $content .= '
                                                                    <tr>
                                                                        <td style="
                                                                            padding: 10px; 
                                                                            border-bottom: 1px solid #ededed; 
                                                                            border-right: 1px solid #ededed; 
                                                                            width: 35%; 
                                                                            font-weight:500; 
                                                                            color:rgba(0,0,0,.64);
                                                                        ">'. $key['label'] .':</td>

                                                                        <td style="
                                                                            padding: 10px; 
                                                                            border-bottom: 1px solid #ededed; 
                                                                            color: #455056;
                                                                        ">'. $key['value'] .'</td>
                                                                    </tr>
                                                                    ';
                                                                }
                                                            } else {
                                                                // Fallback for no values
                                                                $content .= '
                                                                <tr>
                                                                    <td rowspan="2" style="
                                                                        padding: 10px; 
                                                                        border-bottom: 1px solid #ededed; 
                                                                        border-right: 1px solid #ededed; 
                                                                        width: 35%; 
                                                                        font-weight:500; 
                                                                        color:rgba(0,0,0,.64);
                                                                        text-align:center;
                                                                    ">No Value submitted</td>
                                                                </tr>
                                                                ';
                                                            }
                                                            

                                                            $content .= '
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <p style="
                                                font-size:14px; 
                                                color:#455056bd; 
                                                line-height:18px; 
                                                margin:0 0 0;
                                            ">&copy; <strong>www.iwn.ng</strong></p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>

            </html>
    ';
    return $content;
  }

?>


$(function(){
    const apiUrl = 'https://iwn.ng/Assets/forms/form-validation.php';

    $('form').submit(function(event){
        event.preventDefault();

        // Prevent multiple submissions
        var $form = $(this);
        var $submitBtn = $form.find('button[type="submit"], input[type="submit"]');
        
        // Check if form is already submitting
        if ($form.data('submitting')) {
            console.log('Form already submitting, ignoring duplicate submission');
            return false;
        }
        
        // Mark form as submitting and disable button
        $form.data('submitting', true);
        $submitBtn.prop('disabled', true);
        $submitBtn.data('original-text', $submitBtn.text());
        $submitBtn.text('Submitting...');

        toastr.info("Please wait while we process your request.", "Processing...");

        var formData = new FormData(this);

        $.ajax({
            type : 'POST',
            url : apiUrl,
            data : formData,
            dataType : 'json',
            encode : true,
            enctype : 'multipart/form-data',
            cache : false,
            processData: false,
            contentType: false,
        })
        .done(function(data){
            console.log('Server response:', data);
            console.log('Response type:', typeof data);
            if (data.status === true) {
                toastr.success(data.message, "Success");
                setTimeout(() => {
                    location.href = 'confirmation.html';
                }, 3000);
            } else {
                toastr.error(data.message, "Error");
                console.log('Status was false:', data);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log('Ajax error:', textStatus, errorThrown);
            toastr.error("Sorry, we could not proceed with your request.", "Error");
        }).always(function() {
            // Always re-enable the form and button
            $form.data('submitting', false);
            $submitBtn.prop('disabled', false);
            $submitBtn.text($submitBtn.data('original-text'));
        });
    })
})
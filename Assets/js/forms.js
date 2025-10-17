$(function(){
    const apiUrl = 'https://iwn.ng/Assets/forms/form-validation.php';

    $('form').submit(function(event){
        event.preventDefault();

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
        });
    })
})
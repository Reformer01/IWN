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
            if (data.status === true) {
                toastr.success(data.message, "Oops...", {"timeOut": "3000"});
                setTimeout(() => {
                    location.href = 'confirmation.html';
                }, 3e3);
                
            } else {
                toastr.error(data.message, "Oops...");
                
            }
        }).fail(function () {
            toastr.error("Sorry, we could not proceed with your request.", "Oops...");
        });
    })
})
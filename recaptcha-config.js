// reCAPTCHA v2 Invisible Configuration
// Site Key: 6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn
// Domain: iwn.ng

const RECAPTCHA_SITE_KEY = '6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn';

// reCAPTCHA callback function - submits the form after validation
function onSubmit(token) {
    // Find the form containing the reCAPTCHA element
    const recaptchaElements = document.querySelectorAll('.g-recaptcha');
    recaptchaElements.forEach(function(element) {
        const form = element.closest('form');
        if (form) {
            form.submit();
        }
    });
}

// Alternative callback that accepts form ID
function submitFormWithRecaptcha(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.submit();
    }
}

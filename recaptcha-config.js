// reCAPTCHA v2 Invisible Configuration
// Site Key: 6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn
// Domain: iwn.ng

const RECAPTCHA_SITE_KEY = '6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn';

// Track which form triggered reCAPTCHA
let recaptchaTargetForm = null;

// reCAPTCHA callback function - submits the form after validation
function onSubmit(token) {
    // Submit only the form that triggered reCAPTCHA
    if (recaptchaTargetForm) {
        recaptchaTargetForm.submit();
    } else {
        // Fallback: find the form containing the clicked button
        const recaptchaElements = document.querySelectorAll('.g-recaptcha');
        for (const element of recaptchaElements) {
            const form = element.closest('form');
            if (form) {
                form.submit();
                break;
            }
        }
    }
}

// For AJAX forms - execute reCAPTCHA and get token
function executeRecaptcha(callback) {
    if (typeof grecaptcha !== 'undefined') {
        grecaptcha.execute().then(function(token) {
            callback(token);
        });
    } else {
        callback(''); // Fallback if reCAPTCHA not loaded
    }
}

// Alternative callback that accepts form ID
function submitFormWithRecaptcha(formId) {
    const form = document.getElementById(formId);
    if (form) {
        recaptchaTargetForm = form;
        form.submit();
    }
}

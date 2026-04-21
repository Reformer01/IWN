// reCAPTCHA v2 Invisible Configuration
// Site Key: 6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn
// Domain: iwn.ng

const RECAPTCHA_SITE_KEY = '6LfqtsAsAAAAAIb9EnXnmCYo5GdoaKfPmTYHMjAn';

// NOTE: The onSubmit callback is now defined in redesign-form.js
// This file just provides configuration and helper functions

// For manual reCAPTCHA execution if needed
function executeRecaptcha(callback) {
    if (typeof grecaptcha !== 'undefined') {
        grecaptcha.execute().then(function(token) {
            callback(token);
        });
    } else {
        console.error('reCAPTCHA not loaded');
        callback('');
    }
}

// Reset reCAPTCHA
function resetRecaptcha() {
    if (typeof grecaptcha !== 'undefined') {
        grecaptcha.reset();
    }
}

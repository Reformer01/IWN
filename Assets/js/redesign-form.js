
document.addEventListener('DOMContentLoaded', function() {
    // Configure toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: 'toast-top-right',
            timeOut: 5000,
            extendedTimeOut: 1000
        };
    }
    
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        // Check if form has reCAPTCHA
        const recaptchaBtn = form.querySelector('.g-recaptcha');
        
        if (recaptchaBtn) {
            // For forms with reCAPTCHA, handle submission through reCAPTCHA callback
            // Store reference to form for the global callback
            recaptchaBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window._activeRecaptchaForm = form;
                
                // Execute reCAPTCHA
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.execute();
                } else {
                    console.error('reCAPTCHA not loaded');
                    showToast('Security verification not available. Please refresh the page.', 'error');
                }
            });
        } else {
            // Regular form without reCAPTCHA
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                submitFormAjax(form, null);
            });
        }
    });

    // Global reCAPTCHA callback - called by invisible reCAPTCHA
    window.onSubmit = function(token) {
        const form = window._activeRecaptchaForm;
        if (form) {
            submitFormAjax(form, token);
            window._activeRecaptchaForm = null;
        }
    };

    function submitFormAjax(form, recaptchaToken) {
        // Check if already submitting
        if (form.dataset.submitting === 'true') return;

        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
        
        // Set submitting state
        form.dataset.submitting = 'true';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending...';
        }

        // Create FormData
        const formData = new FormData(form);
        
        // Add reCAPTCHA token if provided
        if (recaptchaToken) {
            formData.set('g-recaptcha-response', recaptchaToken);
        }
        
        const action = form.getAttribute('action');

        if (!action) {
            console.error('Form action is missing!');
            showToast('Error: Form configuration is missing.', 'error');
            resetForm(form, submitBtn, originalBtnText);
            return;
        }

        // Show processing toast
        showToast('Processing your request...', 'info');

        fetch(action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            // Check if response is OK before parsing JSON
            if (!response.ok) {
                throw new Error('Server error: ' + response.status + ' ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === true) {
                showToast(data.message || 'Success!', 'success');
                
                // FIRE GOOGLE ADS CONVERSION EVENT HERE
                if (typeof gtag === 'function') {
                    gtag('event', 'conversion', {
                        'send_to': 'AW-17971358769/ef2eCKe2xIYcELHYtPlC'
                    });
                }
                
                // Delay form reset to prevent "form not connected" warning
                setTimeout(() => {
                    form.reset();
                }, 100);
                
                // Reset reCAPTCHA if available
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset();
                }
            } else {
                showToast(data.message || 'An error occurred.', 'error');
                // Reset reCAPTCHA on error so user can try again
                if (typeof grecaptcha !== 'undefined') {
                    grecaptcha.reset();
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Network error. Please try again.', 'error');
            // Reset reCAPTCHA on error
            if (typeof grecaptcha !== 'undefined') {
                grecaptcha.reset();
            }
        })
        .finally(() => {
            resetForm(form, submitBtn, originalBtnText);
        });
    }

    function resetForm(form, btn, originalText) {
        form.dataset.submitting = 'false';
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    function showToast(message, type) {
        // Check if Toastr is available
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            // Fallback to simple alert
            if (type === 'error' || type === 'success') {
                alert(message);
            } else {
                console.log(message);
            }
        }
    }
});


document.addEventListener('DOMContentLoaded', function() {
    // Add custom toast styles to fix positioning
    const toastStyles = document.createElement('style');
    toastStyles.textContent = `
        #toast-container {
            position: fixed !important;
            z-index: 999999 !important;
            top: 12px !important;
            right: 12px !important;
            left: auto !important;
            bottom: auto !important;
        }
        .toast {
            position: relative !important;
            overflow: hidden !important;
            margin-bottom: 12px !important;
            padding: 12px 24px !important;
            width: 300px !important;
            border-radius: 4px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            opacity: 1 !important;
            background-color: #333 !important;
            color: #fff !important;
        }
        .toast-success { background-color: #34A853 !important; }
        .toast-error { background-color: #ea4335 !important; }
        .toast-info { background-color: #F58C29 !important; }
    `;
    document.head.appendChild(toastStyles);
    
    // Configure toastr
    if (typeof toastr !== 'undefined') {
        toastr.options = {
            closeButton: true,
            progressBar: true,
            positionClass: 'toast-top-right',
            timeOut: 5000,
            extendedTimeOut: 1000,
            preventDuplicates: false,
            newestOnTop: true
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
        // Always honor native HTML validation before AJAX submission.
        if (!form.checkValidity()) {
            showValidationError(form);
            form.reportValidity();
            return;
        }

        // Validate required checkbox groups flagged in markup.
        const requiredCheckboxes = Array.from(form.querySelectorAll('input[type="checkbox"][data-group-required="true"][name]'));
        if (requiredCheckboxes.length > 0) {
            const requiredGroupNames = [...new Set(requiredCheckboxes.map((checkbox) => checkbox.name))];
            for (const groupName of requiredGroupNames) {
                const groupCheckboxes = form.querySelectorAll(`input[type="checkbox"][name="${groupName}"]`);
                const hasSelection = Array.from(groupCheckboxes).some((checkbox) => checkbox.checked);
                if (!hasSelection) {
                    if (requiredCheckboxes[0] && typeof requiredCheckboxes[0].setCustomValidity === 'function') {
                        requiredCheckboxes[0].setCustomValidity('Please select at least one option.');
                        showToast('Please select at least one service required before submitting.', 'error');
                        requiredCheckboxes[0].reportValidity();
                        requiredCheckboxes[0].setCustomValidity('');
                    }
                    return;
                }
            }
        }

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

        // Add 30-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        fetch(action, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
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
            clearTimeout(timeoutId);
            console.error('Error:', error);
            if (error.name === 'AbortError') {
                showToast('Request timed out. Please check your connection and try again.', 'error');
            } else {
                showToast('Network error. Please try again.', 'error');
            }
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

    function showValidationError(form) {
        const invalidField = form.querySelector(':invalid');
        if (!invalidField) {
            showToast('Please complete all required fields before submitting.', 'error');
            return;
        }

        const fieldLabel = getFieldLabel(invalidField);
        const missingValueMessage = fieldLabel
            ? `Please complete "${fieldLabel}" before submitting.`
            : 'Please complete all required fields before submitting.';

        if (invalidField.validity && invalidField.validity.valueMissing) {
            showToast(missingValueMessage, 'error');
            return;
        }

        if (invalidField.validity && invalidField.validity.typeMismatch) {
            showToast(`Please enter a valid value for "${fieldLabel || 'this field'}".`, 'error');
            return;
        }

        if (invalidField.validity && invalidField.validity.patternMismatch) {
            showToast(`Please match the expected format for "${fieldLabel || 'this field'}".`, 'error');
            return;
        }

        showToast(missingValueMessage, 'error');
    }

    function getFieldLabel(field) {
        if (field.id) {
            const explicitLabel = formDocument().querySelector(`label[for="${field.id}"]`);
            if (explicitLabel && explicitLabel.textContent) {
                return explicitLabel.textContent.trim();
            }
        }

        const wrappedLabel = field.closest('label');
        if (wrappedLabel && wrappedLabel.textContent) {
            return wrappedLabel.textContent.trim();
        }

        if (field.getAttribute('aria-label')) {
            return field.getAttribute('aria-label').trim();
        }

        if (field.placeholder) {
            return field.placeholder.trim();
        }

        if (field.name) {
            return field.name.replace(/[_-]+/g, ' ').trim();
        }

        return '';
    }

    function formDocument() {
        return document;
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

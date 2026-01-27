
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if already submitting
            if (this.dataset.submitting === 'true') return;

            const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : '';
            
            // Set submitting state
            this.dataset.submitting = 'true';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Sending...';
            }

            // Create FormData
            const formData = new FormData(this);
            const action = this.getAttribute('action');

            if (!action) {
                console.error('Form action is missing!');
                alert('Error: Form configuration is missing.');
                resetForm(this, submitBtn, originalBtnText);
                return;
            }

            // Simple toast notification fallback
            showToast('Processing your request...', 'info');

            fetch(action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === true) {
                    showToast(data.message || 'Success!', 'success');
                    this.reset();
                    // Optional: redirect
                    // window.location.href = 'thank-you.html';
                } else {
                    showToast(data.message || 'An error occurred.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Network error. Please try again.', 'error');
            })
            .finally(() => {
                resetForm(this, submitBtn, originalBtnText);
            });
        });
    });

    function resetForm(form, btn, originalText) {
        form.dataset.submitting = 'false';
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    function showToast(message, type) {
        // Check if Toastr is available
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            // Fallback to simple alert for now, or create a custom div
            if (type === 'error' || type === 'success') {
                alert(message);
            } else {
                console.log(message);
            }
        }
    }
});

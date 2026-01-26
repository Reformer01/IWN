document.getElementById('popupOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closePopup();
    }
});

        // Show popup when page loads
        window.onload = function() {
            document.getElementById('popupOverlay').style.display = 'block';
        }

        // Close popup function
        function closePopup() {
            document.getElementById('popupOverlay').style.display = 'none';
        }

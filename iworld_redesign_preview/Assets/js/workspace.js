document.addEventListener('DOMContentLoaded', function() {
    // Typing animation
    const texts = [
        'Collaborating in real-time...',
        'Sharing documents instantly...',
        'Meeting face-to-face virtually...',
        'Working together seamlessly...'
    ];
    let textIndex = 0;
    let charIndex = 0;

    function type() {
        const typingElement = document.querySelector('.typing-animation');
        if (!typingElement) return;

        if (charIndex < texts[textIndex].length) {
            if (!typingElement.querySelector('.text')) {
                const textSpan = document.createElement('span');
                textSpan.className = 'text';
                typingElement.insertBefore(textSpan, typingElement.querySelector('.cursor'));
            }
            typingElement.querySelector('.text').textContent += texts[textIndex].charAt(charIndex);
            charIndex++;
            setTimeout(type, 100);
        } else {
            setTimeout(erase, 2000);
        }
    }

    function erase() {
        const typingElement = document.querySelector('.typing-animation');
        if (!typingElement) return;

        const textElement = typingElement.querySelector('.text');
        if (textElement && textElement.textContent.length > 0) {
            textElement.textContent = textElement.textContent.slice(0, -1);
            setTimeout(erase, 50);
        } else {
            textIndex = (textIndex + 1) % texts.length;
            charIndex = 0;
            setTimeout(type, 1000);
        }
    }

    // Start the typing animation
    setTimeout(type, 1000);

    // Add floating icons
    const iconContainer = document.createElement('div');
    iconContainer.className = 'floating-icons';
    const icons = ['docs', 'sheets', 'slides', 'meet', 'gmail'];
    
    icons.forEach((icon, index) => {
        const iconElement = document.createElement('img');
        iconElement.src = `./Assets/icons/google_workspace/${icon}.png`;
        iconElement.className = 'floating-icon';
        iconElement.style.cssText = `
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation-delay: ${index * -4}s;
        `;
        iconContainer.appendChild(iconElement);
    });

    document.querySelector('.workspace-interactive-section').appendChild(iconContainer);

    // Add intersection observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-content, .feature-demo').forEach(el => {
        observer.observe(el);
    });
});
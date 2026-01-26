document.addEventListener('DOMContentLoaded', function() {
    const track = document.querySelector('.carousel-track');
    const leftArrow = document.querySelector('.carousel-arrow.left');
    const rightArrow = document.querySelector('.carousel-arrow.right');
    
    let currentIndex = 0;
    let cardWidth = 320; // Width of each card + margin
    let maxCards = track.children.length;

    // Update card width on resize
    function updateCardWidth() {
        if (window.innerWidth <= 768) {
            cardWidth = 280; // Smaller cards on mobile
        } else {
            cardWidth = 320; // Default card width
        }
    }

    // Initialize and listen for resize
    updateCardWidth();
    window.addEventListener('resize', updateCardWidth);

    // Handle arrow clicks
    leftArrow.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    rightArrow.addEventListener('click', () => {
        if (currentIndex < maxCards - 1) {
            currentIndex++;
            updateCarousel();
        }
    });

    // Update carousel position
    function updateCarousel() {
        const offset = -currentIndex * cardWidth;
        track.style.transform = `translateX(${offset}px)`;
        
        // Update arrow visibility
        leftArrow.style.opacity = currentIndex === 0 ? '0.5' : '1';
        rightArrow.style.opacity = currentIndex >= maxCards - 1 ? '0.5' : '1';
    }

    // Add hover effect to cards
    const cards = document.querySelectorAll('.carousel-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const bg = card.querySelector('.card-bg');
            bg.style.transform = 'scale(1)';
            bg.style.opacity = '1';
        });

        card.addEventListener('mouseleave', () => {
            const bg = card.querySelector('.card-bg');
            bg.style.transform = 'scale(0.5)';
            bg.style.opacity = '0';
        });
    });

    // Initial arrow state
    updateCarousel();
});

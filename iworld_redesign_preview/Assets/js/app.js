$(document).ready(function () {
    $('.home-header-slide-container').slidejs({
      start: 1, // Start with the first slide
      time: 5000, // Time between slides in milliseconds (adjust as needed)
      auto: true, // Auto play the carousel
    });
  });


  $('.testimonial-carousel').owlCarousel({
    loop: true,
    margin: 20,
    nav: true,
    responsive:{
        0: {
            items: 1
        },
        768: {
            items: 2
        },
        992: {
            items: 3
        }
    }
});


// Recaptcha
// Submit Buttons for forms




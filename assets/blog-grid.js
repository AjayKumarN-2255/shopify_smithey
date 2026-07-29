document.addEventListener("DOMContentLoaded", () => {
    const track = document.querySelector(".blog-grid__track");
    const slides = document.querySelectorAll(".blog-grid__carousel-image");
    const prevBtn = document.querySelector(".blog-grid__button--prev");
    const nextBtn = document.querySelector(".blog-grid__button--next");

    // Guard: exit if any element is missing (e.g. no blog selected yet)
    if (!track || !slides.length || !prevBtn || !nextBtn) return;

    let currentIndex = 0;
    const totalSlides = slides.length;

    function updateSlider() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    nextBtn.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
    });

    prevBtn.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
    });
});
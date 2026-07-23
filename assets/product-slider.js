document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".product-slider").forEach((slider) => {
        const viewport = slider.querySelector(".product-slider__viewport");
        const rail = slider.querySelector(".product-slider__rail");
        const cards = slider.querySelectorAll(".product-card");
        const prevBtn = slider.querySelector(".product-slider__button--prev");
        const nextBtn = slider.querySelector(".product-slider__button--next");

        if (!rail || !cards.length) return;

        let currentIndex = 0;

        const gap = parseFloat(getComputedStyle(rail).gap) || 0;
        const cardWidth = cards[0].offsetWidth + gap;

        const maxIndex = cards.length - Math.floor(viewport.offsetWidth / cardWidth);

        function updateSlider() {
            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= maxIndex;
        }

        nextBtn.addEventListener("click", () => {
            if (currentIndex < maxIndex) {
                currentIndex++;
                updateSlider();
            }
        });

        prevBtn.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateSlider();
            }
        });

        window.addEventListener("resize", () => {
            updateSlider();
        });

        updateSlider();
    });
});
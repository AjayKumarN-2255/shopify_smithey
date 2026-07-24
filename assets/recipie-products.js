document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".recipe-slider").forEach((slider) => {
        const viewport = slider.querySelector(".recipe-slider__viewport");
        const rail = slider.querySelector(".recipe-slider__rail");
        const cards = slider.querySelectorAll(".recipe-card");
        const prevBtn = slider.querySelector(".recipe-slider__button--prev");
        const nextBtn = slider.querySelector(".recipe-slider__button--next");

        if (!rail || !cards.length) return;

        let currentIndex = 0;

        function updateValues() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            const cardWidth = cards[0].offsetWidth + gap;
            const visibleCards = Math.floor(viewport.offsetWidth / cardWidth);
            const maxIndex = Math.max(0, cards.length - visibleCards);

            if (currentIndex > maxIndex) {
                currentIndex = maxIndex;
            }

            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= maxIndex;
        }

        nextBtn.addEventListener("click", () => {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            const cardWidth = cards[0].offsetWidth + gap;
            const visibleCards = Math.floor(viewport.offsetWidth / cardWidth);
            const maxIndex = Math.max(0, cards.length - visibleCards);

            if (currentIndex < maxIndex) {
                currentIndex++;
                updateValues();
            }
        });

        prevBtn.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateValues();
            }
        });

        window.addEventListener("resize", updateValues);

        updateValues();
    });
});
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".recipe-slider").forEach((slider) => {
        const viewport = slider.querySelector(".recipe-slider__viewport");
        const rail = slider.querySelector(".recipe-slider__rail");
        const cards = slider.querySelectorAll(".recipe-card");
        const prevBtn = slider.querySelector(".recipe-slider__button--prev");
        const nextBtn = slider.querySelector(".recipe-slider__button--next");

        if (!rail || !viewport || !cards.length) return;

        let currentIndex = 0;

        function getCardStep() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            return cards[0].offsetWidth + gap;
        }

        function getVisibleCards() {
            if (viewport.offsetWidth >= 1024) return 3;

            const cardWidth = getCardStep();
            return Math.max(1, Math.floor(viewport.offsetWidth / cardWidth));
        }

        function updateValues() {
            const cardWidth = getCardStep();
            const visibleCards = getVisibleCards();
            const maxIndex = Math.max(0, cards.length - visibleCards);

            if (currentIndex > maxIndex) {
                currentIndex = maxIndex;
            }

            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                const visibleCards = getVisibleCards();
                const maxIndex = Math.max(0, cards.length - visibleCards);

                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateValues();
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateValues();
                }
            });
        }

        window.addEventListener("resize", updateValues);

        updateValues();
    });
});

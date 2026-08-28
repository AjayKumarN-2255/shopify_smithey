document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".recipe-slider").forEach((slider) => {
        const viewport = slider.querySelector(".recipe-slider__viewport");
        const rail = slider.querySelector(".recipe-slider__rail");
        const cards = slider.querySelectorAll(".recipe-card");
        const prevBtn = slider.querySelector(".recipe-slider__button--prev");
        const nextBtn = slider.querySelector(".recipe-slider__button--next");

        if (!rail || !cards.length) return;

        let currentIndex = 0;

        function getCardStep() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;

            if (viewport.offsetWidth >= 1024) {
                const visibleCards = 3;
                const cardBodyWidth =
                    (viewport.offsetWidth - gap * (visibleCards - 1)) / visibleCards;

                cards.forEach((card) => {
                    card.style.flex = `0 0 ${cardBodyWidth}px`;
                });

                return cardBodyWidth + gap;
            }

            cards.forEach((card) => {
                card.style.flex = "";
            });

            return cards[0].offsetWidth + gap;
        }

        function updateValues() {
            const cardWidth = getCardStep();
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
            const cardWidth = getCardStep();
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
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".recipe-slider").forEach((slider) => {
        const viewport = slider.querySelector(".recipe-slider__viewport");
        const rail = slider.querySelector(".recipe-slider__rail");
        const cards = slider.querySelectorAll(".recipe-card");
        const prevBtn = slider.querySelector(".recipe-slider__button--prev");
        const nextBtn = slider.querySelector(".recipe-slider__button--next");
        const dotsContainer = slider.querySelector(".recipe-slider__dots");

        if (!rail || !viewport || !cards.length) return;

        let currentIndex = 0;

        function getCardStep() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            return cards[0].offsetWidth + gap;
        }

        function getVisibleCards() {
            if (viewport.offsetWidth >= 1250) return 3;
            if (viewport.offsetWidth >= 1024) return 2;

            const cardWidth = getCardStep();
            return Math.max(1, Math.floor(viewport.offsetWidth / cardWidth));
        }

        function getMaxIndex() {
            return Math.max(0, cards.length - getVisibleCards());
        }

        function isMobileDots() {
            return window.innerWidth < 920;
        }

        function renderDots() {
            if (!dotsContainer) return;

            if (!isMobileDots()) {
                dotsContainer.innerHTML = "";
                return;
            }

            const totalDots = getMaxIndex() + 1;
            const existing = dotsContainer.querySelectorAll(".recipe-slider__dot");

            if (existing.length !== totalDots) {
                dotsContainer.innerHTML = "";

                for (let i = 0; i < totalDots; i++) {
                    const dot = document.createElement("button");
                    dot.type = "button";
                    dot.className = "recipe-slider__dot";
                    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
                    dot.addEventListener("click", () => {
                        currentIndex = i;
                        updateValues();
                    });
                    dotsContainer.appendChild(dot);
                }
            }

            dotsContainer.querySelectorAll(".recipe-slider__dot").forEach((dot, index) => {
                dot.classList.toggle("is-active", index === currentIndex);
            });
        }

        function updateValues() {
            const cardWidth = getCardStep();
            const maxIndex = getMaxIndex();

            if (currentIndex > maxIndex) {
                currentIndex = maxIndex;
            }

            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;

            renderDots();
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                const maxIndex = getMaxIndex();

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

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".testimonial-slider").forEach((slider) => {
        const viewport = slider.querySelector(".testimonial-slider__viewport");
        const rail = slider.querySelector(".testimonial-slider__rail");
        const cards = slider.querySelectorAll(".testimonial-card");
        const prevBtn = slider.querySelector(".testimonial-slider__button--prev");
        const nextBtn = slider.querySelector(".testimonial-slider__button--next");
        const dots = slider.querySelectorAll(".testimonial-slider__dot");

        if (!rail || !cards.length) return;

        let currentIndex = 0;
        let startX = 0;
        let endX = 0;

        function getCardWidth() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            return cards[0].offsetWidth + gap;
        }

        function getVisibleCards() {
            return Math.max(1, Math.floor(viewport.offsetWidth / getCardWidth()));
        }

        function getMaxIndex() {
            return Math.max(0, cards.length - getVisibleCards());
        }

        function updateDots() {
            if (!dots.length) return;

            const activeDot = Math.min(currentIndex, dots.length - 1);

            dots.forEach((dot, index) => {
                dot.classList.toggle("is-active", index === activeDot);
            });
        }

        function updateSlider() {
            rail.style.transform = `translateX(-${currentIndex * getCardWidth()}px)`;

            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex >= getMaxIndex();

            updateDots();
        }

        nextBtn.addEventListener("click", () => {
            if (currentIndex < getMaxIndex()) {
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

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                currentIndex = Math.min(index, getMaxIndex());
                updateSlider();
            });
        });

        /* Touch swipe */
        viewport.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        });

        viewport.addEventListener("touchend", (e) => {
            endX = e.changedTouches[0].clientX;

            const diff = startX - endX;
            const threshold = 50;

            if (Math.abs(diff) < threshold) return;

            if (diff > 0 && currentIndex < getMaxIndex()) {
                currentIndex++;
            } else if (diff < 0 && currentIndex > 0) {
                currentIndex--;
            }

            updateSlider();
        });

        window.addEventListener("resize", () => {
            currentIndex = Math.min(currentIndex, getMaxIndex());
            updateSlider();
        });

        updateSlider();
    });
});
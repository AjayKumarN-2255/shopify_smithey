document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".testimonial-slider").forEach((slider) => {
        const viewport = slider.querySelector(".testimonial-slider__viewport");
        const rail = slider.querySelector(".testimonial-slider__rail");
        const prevBtn = slider.querySelector(".testimonial-slider__button--prev");
        const nextBtn = slider.querySelector(".testimonial-slider__button--next");
        const dots = slider.querySelectorAll(".testimonial-slider__dot");

        if (!rail || !viewport) return;

        let originalCards = [...rail.querySelectorAll(".testimonial-card")];
        if (originalCards.length < 2) return;

        let currentIndex = 0;
        let cloneCount = 0;
        let cardWidth = 0;
        let isAnimating = false;
        let animationTimer = null;
        let startX = 0;
        let endX = 0;

        const transitionDuration = 400;

        function getGap() {
            return parseFloat(getComputedStyle(rail).gap) || 0;
        }

        function measure() {
            const gap = getGap();
            cardWidth = originalCards[0].offsetWidth + gap;
            const visibleCards = Math.max(1, Math.floor(viewport.offsetWidth / cardWidth));
            return visibleCards;
        }

        function getLogicalIndex() {
            const total = originalCards.length;
            return ((currentIndex - cloneCount) % total + total) % total;
        }

        function updateDots() {
            if (!dots.length) return;

            const activeDot = getLogicalIndex();

            dots.forEach((dot, index) => {
                dot.classList.toggle("is-active", index === activeDot);
            });
        }

        function removeClones() {
            rail.querySelectorAll(".testimonial-card--clone").forEach((clone) => clone.remove());
        }

        function buildLoop() {
            removeClones();
            originalCards = [...rail.querySelectorAll(".testimonial-card")];

            const total = originalCards.length;
            const visibleCards = measure();

            cloneCount = Math.min(total, Math.max(visibleCards, 1));

            const prependFragment = document.createDocumentFragment();
            for (let i = total - cloneCount; i < total; i++) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add("testimonial-card--clone");
                clone.setAttribute("aria-hidden", "true");
                prependFragment.appendChild(clone);
            }
            rail.insertBefore(prependFragment, originalCards[0]);

            const appendFragment = document.createDocumentFragment();
            for (let i = 0; i < cloneCount; i++) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add("testimonial-card--clone");
                clone.setAttribute("aria-hidden", "true");
                appendFragment.appendChild(clone);
            }
            rail.appendChild(appendFragment);

            currentIndex = cloneCount;
        }

        function setPosition(animate = true) {
            rail.classList.toggle("testimonial-slider__rail--no-transition", !animate);
            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            if (!animate) {
                rail.offsetHeight;
                rail.classList.remove("testimonial-slider__rail--no-transition");
            }
        }

        function normalizePosition() {
            const total = originalCards.length;

            if (currentIndex >= cloneCount + total) {
                currentIndex = cloneCount;
                setPosition(false);
            } else if (currentIndex < cloneCount) {
                currentIndex = cloneCount + total - 1;
                setPosition(false);
            }

            updateDots();
        }

        function finishAnimation() {
            if (!isAnimating) return;

            isAnimating = false;
            clearTimeout(animationTimer);
            normalizePosition();
        }

        function move(direction) {
            if (isAnimating) return;

            isAnimating = true;
            currentIndex += direction;
            setPosition(true);
            updateDots();

            clearTimeout(animationTimer);
            animationTimer = setTimeout(finishAnimation, transitionDuration + 50);
        }

        function goToSlide(index) {
            if (isAnimating) return;

            const targetIndex = cloneCount + index;
            if (targetIndex === currentIndex) return;

            isAnimating = true;
            currentIndex = targetIndex;
            setPosition(true);
            updateDots();

            clearTimeout(animationTimer);
            animationTimer = setTimeout(finishAnimation, transitionDuration + 50);
        }

        function init() {
            buildLoop();
            measure();
            setPosition(false);
            updateDots();
        }

        rail.addEventListener("transitionend", (event) => {
            if (event.target !== rail || event.propertyName !== "transform") return;
            finishAnimation();
        });

        nextBtn.addEventListener("click", () => move(1));
        prevBtn.addEventListener("click", () => move(-1));

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => goToSlide(index));
        });

        viewport.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        });

        viewport.addEventListener("touchend", (e) => {
            endX = e.changedTouches[0].clientX;

            const diff = startX - endX;
            const threshold = 50;

            if (Math.abs(diff) < threshold) return;

            if (diff > 0) move(1);
            else move(-1);
        });

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(init, 150);
        });

        init();
    });
});

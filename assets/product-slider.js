document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".product-slider").forEach((slider) => {
        const viewport = slider.querySelector(".product-slider__viewport");
        const rail = slider.querySelector(".product-slider__rail");
        const prevBtn = slider.querySelector(".product-slider__button--prev");
        const nextBtn = slider.querySelector(".product-slider__button--next");

        if (!rail || !viewport) return;

        let originalCards = [...rail.querySelectorAll(".product-card")];
        if (originalCards.length < 2) return;

        let currentIndex = 0;
        let cloneCount = 0;
        let cardWidth = 0;
        let isAnimating = false;
        let animationTimer = null;

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

        function removeClones() {
            rail.querySelectorAll(".product-card--clone").forEach((clone) => clone.remove());
        }

        function buildLoop() {
            removeClones();
            originalCards = [...rail.querySelectorAll(".product-card")];

            const total = originalCards.length;
            const visibleCards = measure();

            cloneCount = Math.min(total, Math.max(visibleCards, 1));

            const prependFragment = document.createDocumentFragment();
            for (let i = total - cloneCount; i < total; i++) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add("product-card--clone");
                clone.setAttribute("aria-hidden", "true");
                prependFragment.appendChild(clone);
            }
            rail.insertBefore(prependFragment, originalCards[0]);

            const appendFragment = document.createDocumentFragment();
            for (let i = 0; i < cloneCount; i++) {
                const clone = originalCards[i].cloneNode(true);
                clone.classList.add("product-card--clone");
                clone.setAttribute("aria-hidden", "true");
                appendFragment.appendChild(clone);
            }
            rail.appendChild(appendFragment);

            currentIndex = cloneCount;
        }

        function setPosition(animate = true) {
            rail.classList.toggle("product-slider__rail--no-transition", !animate);
            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            if (!animate) {
                rail.offsetHeight;
                rail.classList.remove("product-slider__rail--no-transition");
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

            clearTimeout(animationTimer);
            animationTimer = setTimeout(finishAnimation, transitionDuration + 50);
        }

        function init() {
            buildLoop();
            measure();
            setPosition(false);
        }

        rail.addEventListener("transitionend", (event) => {
            if (event.target !== rail || event.propertyName !== "transform") return;
            finishAnimation();
        });

        nextBtn.addEventListener("click", () => move(1));
        prevBtn.addEventListener("click", () => move(-1));

        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(init, 150);
        });

        init();
    });
});

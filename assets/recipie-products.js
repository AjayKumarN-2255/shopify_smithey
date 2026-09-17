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
        let startX = 0;
        let startY = 0;
        let isPointerDown = false;
        let isDragging = false;
        let hasDragged = false;
        let pointerId = null;

        function getCardStep() {
            const gap = parseFloat(getComputedStyle(rail).gap) || 0;
            return cards[0].offsetWidth + gap;
        }

        function getVisibleCards() {
            if (viewport.offsetWidth >= 1250) return 3;
            if (viewport.offsetWidth >= 1024) return 2;

            const cardWidth = getCardStep();
            if (!cardWidth) return 1;

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

            if (currentIndex < 0) {
                currentIndex = 0;
            }

            rail.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;

            renderDots();
        }

        function move(direction) {
            const maxIndex = getMaxIndex();
            const nextIndex = currentIndex + direction;

            if (nextIndex < 0 || nextIndex > maxIndex) return;

            currentIndex = nextIndex;
            updateValues();
        }

        function endDrag(clientX) {
            if (!isPointerDown) return;

            isPointerDown = false;
            pointerId = null;

            if (!isDragging) {
                hasDragged = false;
                return;
            }

            const diff = startX - clientX;
            const threshold = 40;

            if (Math.abs(diff) >= threshold) {
                move(diff > 0 ? 1 : -1);
            }

            isDragging = false;
            viewport.classList.remove("is-dragging");

            window.setTimeout(() => {
                hasDragged = false;
            }, 0);
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => move(1));
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => move(-1));
        }

        viewport.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;

            isPointerDown = true;
            isDragging = false;
            hasDragged = false;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
        });

        viewport.addEventListener("pointermove", (event) => {
            if (!isPointerDown || event.pointerId !== pointerId) return;

            const dx = event.clientX - startX;
            const dy = event.clientY - startY;

            if (!isDragging) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

                // Vertical scroll wins when movement is mostly vertical.
                if (Math.abs(dy) > Math.abs(dx)) {
                    isPointerDown = false;
                    pointerId = null;
                    return;
                }

                isDragging = true;
                hasDragged = true;
                viewport.classList.add("is-dragging");

                try {
                    viewport.setPointerCapture(event.pointerId);
                } catch (error) {
                    // Ignore browsers that reject capture mid-gesture.
                }
            }

            event.preventDefault();
        });

        viewport.addEventListener("pointerup", (event) => {
            if (event.pointerId !== pointerId) return;
            endDrag(event.clientX);
        });

        viewport.addEventListener("pointercancel", (event) => {
            if (event.pointerId !== pointerId) return;
            endDrag(event.clientX);
        });

        // Fallback for environments where pointer events are unreliable.
        viewport.addEventListener(
            "touchstart",
            (event) => {
                if (isPointerDown) return;
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                isPointerDown = true;
                isDragging = false;
                hasDragged = false;
            },
            { passive: true }
        );

        viewport.addEventListener(
            "touchmove",
            (event) => {
                if (!isPointerDown) return;

                const dx = event.touches[0].clientX - startX;
                const dy = event.touches[0].clientY - startY;

                if (!isDragging) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

                    if (Math.abs(dy) > Math.abs(dx)) {
                        isPointerDown = false;
                        return;
                    }

                    isDragging = true;
                    hasDragged = true;
                    viewport.classList.add("is-dragging");
                }

                if (isDragging && event.cancelable) {
                    event.preventDefault();
                }
            },
            { passive: false }
        );

        viewport.addEventListener("touchend", (event) => {
            if (!isPointerDown) return;
            endDrag(event.changedTouches[0].clientX);
        });

        viewport.addEventListener(
            "click",
            (event) => {
                if (!hasDragged) return;
                event.preventDefault();
                event.stopPropagation();
            },
            true
        );

        rail.querySelectorAll("img").forEach((img) => {
            img.draggable = false;
        });

        window.addEventListener("resize", updateValues);

        updateValues();
    });
});

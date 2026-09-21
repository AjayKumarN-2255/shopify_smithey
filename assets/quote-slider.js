document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".quote-slider").forEach((slider) => {
    const viewport = slider.querySelector(".quote-slider__viewport");
    const rail = slider.querySelector(".quote-slider__rail");
    const dots = slider.querySelectorAll(".quote-slider__dot");

    if (!viewport || !rail) return;

    let originalSlides = [...rail.querySelectorAll(".quote-slider__slide")];
    if (originalSlides.length < 2) return;

    let currentIndex = 0;
    let cloneCount = 0;
    let slideWidth = 0;
    let isAnimating = false;
    let animationTimer = null;
    let autoplayTimer = null;
    let startX = 0;
    let endX = 0;
    let isPointerDown = false;

    const transitionDuration = 400;
    const autoplayDelay = 5000;

    function measure() {
      slideWidth = Math.round(slider.getBoundingClientRect().width) || slider.offsetWidth || window.innerWidth;

      rail.querySelectorAll(".quote-slider__slide").forEach((slide) => {
        slide.style.width = `${slideWidth}px`;
        slide.style.minWidth = `${slideWidth}px`;
        slide.style.maxWidth = `${slideWidth}px`;
        slide.style.flexBasis = `${slideWidth}px`;
      });

      return slideWidth;
    }

    function getLogicalIndex() {
      const total = originalSlides.length;
      return ((currentIndex - cloneCount) % total + total) % total;
    }

    function updateDots() {
      if (!dots.length) return;

      const activeDot = getLogicalIndex();

      dots.forEach((dot, index) => {
        const isActive = index === activeDot;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
      });
    }

    function removeClones() {
      rail.querySelectorAll(".quote-slider__slide--clone").forEach((clone) => clone.remove());
    }

    function buildLoop() {
      removeClones();
      originalSlides = [...rail.querySelectorAll(".quote-slider__slide:not(.quote-slider__slide--clone)")];

      const total = originalSlides.length;
      cloneCount = 1;

      const prependClone = originalSlides[total - 1].cloneNode(true);
      prependClone.classList.add("quote-slider__slide--clone");
      prependClone.removeAttribute("data-shopify-editor-block");
      prependClone.setAttribute("aria-hidden", "true");
      rail.insertBefore(prependClone, originalSlides[0]);

      const appendClone = originalSlides[0].cloneNode(true);
      appendClone.classList.add("quote-slider__slide--clone");
      appendClone.removeAttribute("data-shopify-editor-block");
      appendClone.setAttribute("aria-hidden", "true");
      rail.appendChild(appendClone);

      currentIndex = cloneCount;
    }

    function setPosition(animate = true) {
      rail.classList.toggle("quote-slider__rail--no-transition", !animate);
      rail.style.transform = `translateX(-${currentIndex * slideWidth}px)`;

      if (!animate) {
        rail.offsetHeight;
        rail.classList.remove("quote-slider__rail--no-transition");
      }
    }

    function normalizePosition() {
      const total = originalSlides.length;

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
      restartAutoplay();
    }

    function goToSlide(logicalIndex) {
      if (isAnimating) return;

      const targetIndex = cloneCount + logicalIndex;
      if (targetIndex === currentIndex) return;

      isAnimating = true;
      currentIndex = targetIndex;
      setPosition(true);
      updateDots();

      clearTimeout(animationTimer);
      animationTimer = setTimeout(finishAnimation, transitionDuration + 50);
      restartAutoplay();
    }

    function stopAutoplay() {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(() => move(1), autoplayDelay);
    }

    function restartAutoplay() {
      startAutoplay();
    }

    function init() {
      buildLoop();
      measure();
      setPosition(false);
      updateDots();
      startAutoplay();
    }

    rail.addEventListener("transitionend", (event) => {
      if (event.target !== rail || event.propertyName !== "transform") return;
      finishAnimation();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => goToSlide(index));
    });

    viewport.addEventListener("touchstart", (event) => {
      isPointerDown = true;
      startX = event.touches[0].clientX;
      stopAutoplay();
    }, { passive: true });

    viewport.addEventListener("touchend", (event) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      endX = event.changedTouches[0].clientX;
      const diff = startX - endX;
      const threshold = 40;

      if (Math.abs(diff) >= threshold) {
        if (diff > 0) move(1);
        else move(-1);
      } else {
        startAutoplay();
      }
    }, { passive: true });

    viewport.addEventListener("mousedown", (event) => {
      isPointerDown = true;
      startX = event.clientX;
      stopAutoplay();
    });

    window.addEventListener("mouseup", (event) => {
      if (!isPointerDown) return;
      isPointerDown = false;

      endX = event.clientX;
      const diff = startX - endX;
      const threshold = 40;

      if (Math.abs(diff) >= threshold) {
        if (diff > 0) move(1);
        else move(-1);
      } else {
        startAutoplay();
      }
    });

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        setPosition(false);
        updateDots();
      }, 150);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    init();
  });
});

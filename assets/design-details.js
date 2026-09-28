document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-design-details]').forEach((root) => {
    initDesignDetailsDesktop(root);
    initDesignDetailsMobile(root);
  });
});

function initDesignDetailsDesktop(root) {
  const items = [...root.querySelectorAll('[data-design-index]')];
  const panels = [...root.querySelectorAll('[data-design-panel]')];

  if (!items.length || !panels.length) return;

  const activate = (index) => {
    items.forEach((item) => {
      const isActive = Number(item.dataset.designIndex) === index;
      item.classList.toggle('design-details__item--active', isActive);
      item.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      const isActive = Number(panel.dataset.designPanel) === index;
      panel.classList.toggle('design-details__panel--active', isActive);
    });
  };

  items.forEach((item) => {
    const index = Number(item.dataset.designIndex);

    item.addEventListener('mouseenter', () => activate(index));
    item.addEventListener('focus', () => activate(index));
    item.addEventListener('click', () => activate(index));
  });
}

function initDesignDetailsMobile(root) {
  const viewport = root.querySelector('[data-design-viewport]');
  if (!viewport) return;

  const slides = [...viewport.querySelectorAll('[data-design-slide]')];
  const dots = [...root.querySelectorAll('[data-design-dot]')];

  if (slides.length < 2) return;

  let index = 0;
  let frame = 0;
  let isProgrammatic = false;
  let scrollTimer;
  const mobileQuery = window.matchMedia('(max-width: 919px)');

  const setIndex = (nextIndex) => {
    const total = slides.length;
    index = (nextIndex + total) % total;

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.classList.toggle('is-active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });

    slides.forEach((slide, slideIndex) => {
      slide.setAttribute('aria-hidden', slideIndex === index ? 'false' : 'true');
    });
  };

  const goTo = (nextIndex) => {
    const total = slides.length;
    const target = (nextIndex + total) % total;
    const width = viewport.clientWidth;

    if (!width) return;

    isProgrammatic = true;
    setIndex(target);
    viewport.scrollTo({
      left: target * width,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });

    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      isProgrammatic = false;
    }, 500);
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.designDot)));
  });

  viewport.addEventListener(
    'scroll',
    () => {
      if (isProgrammatic) return;

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const width = viewport.clientWidth || 1;
        const nextIndex = Math.round(viewport.scrollLeft / width);

        if (nextIndex !== index && nextIndex >= 0 && nextIndex < slides.length) {
          setIndex(nextIndex);
        }
      });
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    if (!mobileQuery.matches) return;

    const width = viewport.clientWidth;
    if (!width) return;

    viewport.scrollTo({
      left: index * width,
      behavior: 'auto',
    });
  });

  setIndex(0);
}

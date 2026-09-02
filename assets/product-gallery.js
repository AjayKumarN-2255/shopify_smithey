document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('[data-product-gallery]');
  if (!gallery) return;

  const track = gallery.querySelector('[data-product-media-track]');
  const slides = gallery.querySelectorAll('[data-product-media-slide]');
  const thumbnails = gallery.querySelectorAll('[data-product-thumbnail]');

  if (!track || slides.length <= 1 || !thumbnails.length) return;

  let activeIndex = 0;
  let isScrolling = false;
  let scrollTimeout;

  const setActiveThumbnail = (index) => {
    if (index < 0 || index >= slides.length || index === activeIndex) return;

    activeIndex = index;

    thumbnails.forEach((thumbnail, thumbnailIndex) => {
      const isActive = thumbnailIndex === index;
      thumbnail.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  const scrollToSlide = (index) => {
    const slide = slides[index];
    if (!slide) return;

    isScrolling = true;
    slide.scrollIntoView({
      behavior: 'smooth',
      inline: 'start',
      block: 'nearest',
    });
    setActiveThumbnail(index);

    window.clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
      isScrolling = false;
    }, 400);
  };

  const getActiveSlideIndex = () => {
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const slideCenter = slideRect.left + slideRect.width / 2;
      const distance = Math.abs(slideCenter - trackCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => {
      const index = Number.parseInt(thumbnail.dataset.imageIndex, 10);
      if (Number.isNaN(index)) return;

      scrollToSlide(index);
    });
  });

  track.addEventListener(
    'scroll',
    () => {
      if (isScrolling) return;

      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        setActiveThumbnail(getActiveSlideIndex());
      }, 80);
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    scrollToSlide(activeIndex);
  });
});

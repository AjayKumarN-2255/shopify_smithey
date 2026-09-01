document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('[data-product-gallery]');
  if (!gallery) return;

  const mainImage = gallery.querySelector('[data-product-main-image]');
  const thumbnails = gallery.querySelectorAll('.product__thumbnail');
  if (!mainImage || !thumbnails.length) return;

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', () => {
      const imageSrc = thumbnail.dataset.imageSrc;
      if (!imageSrc || mainImage.src === imageSrc) return;

      mainImage.src = imageSrc;
    });
  });
});

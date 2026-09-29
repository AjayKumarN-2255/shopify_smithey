/* Product variants – Size pills (Glass Lids style)
 * Mobile: 2-col flex wrap, centered last row
 * Desktop: 3-col flex wrap, centered
 * Updates hidden variant id + prices + ATC state
 */
(function () {
  'use strict';

  function formatMoney(cents) {
    if (cents == null) return '';
    // Respect Shopify.money_format when available, fallback to $X.XX
    try {
      if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        return window.Shopify.formatMoney(cents, window.Shopify.money_format || '${{amount}}');
      }
    } catch (e) {
      // noop
    }
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  function initVariantPicker(scope) {
    var container = scope.querySelector('[data-product-variants]');
    var jsonEl = scope.querySelector('[data-product-variants-json]');
    if (!container || !jsonEl) return;

    var variants = [];
    try {
      variants = JSON.parse(jsonEl.textContent);
    } catch (e) {
      return;
    }
    if (!variants.length) return;

    var form = scope.querySelector('.product__form');
    var idInput = form ? form.querySelector('input[name="id"]') : null;
    var atcButton = form ? form.querySelector('.product__add-to-cart') : null;
    var atcLabel = form ? form.querySelector('.product__add-to-cart-label') : null;

    function getSelectedOptions() {
      var groups = Array.prototype.slice.call(container.querySelectorAll('.product__variant-group'));
      return groups.map(function (group) {
        var selected = group.querySelector('.product__variant-pill.is-selected');
        return selected ? selected.getAttribute('data-option-value') : null;
      });
    }

    function findVariant(selected) {
      return variants.find(function (variant) {
        // variant.options = ["6\" LID", ...]
        if (!variant.options) return false;
        return variant.options.every(function (opt, i) {
          return opt === selected[i];
        });
      });
    }

    function updateUI(variant) {
      if (!variant) return;

      if (idInput) idInput.value = variant.id;

      // Prices – desktop + mobile + ATC
      var priceEls = scope.querySelectorAll(
        '.product__price, .product__mobile-price, .product__add-to-cart-price'
      );
      priceEls.forEach(function (el) {
        // variant.price comes as cents (number) in product.variants JSON
        el.textContent = formatMoney(variant.price);
      });

      var compareEls = scope.querySelectorAll(
        '.product__compare-price, .product__mobile-compare-price'
      );
      compareEls.forEach(function (el) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          el.textContent = formatMoney(variant.compare_at_price);
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });

      if (atcButton) {
        atcButton.disabled = !variant.available;
        if (atcLabel) {
          atcLabel.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
        }
      }
    }

    container.addEventListener('click', function (event) {
      var pill = event.target.closest('.product__variant-pill');
      if (!pill || !container.contains(pill)) return;

      var group = pill.closest('.product__variant-group');
      if (!group) return;

      group.querySelectorAll('.product__variant-pill').forEach(function (p) {
        p.classList.remove('is-selected');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('is-selected');
      pill.setAttribute('aria-checked', 'true');

      var selected = getSelectedOptions();
      var variant = findVariant(selected);
      updateUI(variant);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.product__info').forEach(initVariantPicker);
    // Fallback: if .product__info missing, init on whole product section
    if (!document.querySelector('.product__info [data-product-variants]')) {
      document.querySelectorAll('.product').forEach(initVariantPicker);
    }
  });
})();

/* Product Use: tab switching scoped to each section instance. No globals. */
(function () {
  function setPanelVideoState(panel, isActive) {
    var video = panel.querySelector('video');
    if (!video) return;

    if (isActive) {
      try {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {});
        }
      } catch (error) {
        /* Autoplay blocked; the video remains visible with its poster. */
      }
    } else {
      video.pause();
    }
  }

  function initProductUse(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-product-use-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-product-use-panel]'));

    if (!tabs.length || !panels.length) return;

    var activate = function (index) {
      tabs.forEach(function (tab) {
        var isActive = Number(tab.getAttribute('data-product-use-tab')) === index;
        tab.classList.toggle('product-use__tab--active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          tab.setAttribute('aria-current', 'true');
        } else {
          tab.removeAttribute('aria-current');
        }
      });

      panels.forEach(function (panel) {
        var isActive = Number(panel.getAttribute('data-product-use-panel')) === index;
        panel.classList.toggle('product-use__panel--active', isActive);
        setPanelVideoState(panel, isActive);
      });
    };

    tabs.forEach(function (tab) {
      var index = Number(tab.getAttribute('data-product-use-tab'));

      tab.addEventListener('click', function () {
        activate(index);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-product-use]').forEach(initProductUse);
  });
})();

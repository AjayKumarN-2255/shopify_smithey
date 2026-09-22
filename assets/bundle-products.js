document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.bundle-products').forEach((section) => {
    const tabs = [...section.querySelectorAll('.bundle-products__tab')];
    const panels = [...section.querySelectorAll('.bundle-products__panel')];
    const header = section.querySelector('.bundle-products__header');

    if (!tabs.length || !panels.length) return;

    const headerOffset = () => {
      return (header ? header.getBoundingClientRect().height : 0) + 12;
    };

    const setActive = (tabId) => {
      tabs.forEach((item) => {
        const isActive = item.dataset.tab === tabId;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const panel = panels.find((item) => item.dataset.panel === tab.dataset.tab);
        if (!panel) return;

        setActive(tab.dataset.tab);

        const top = panel.getBoundingClientRect().top + window.scrollY - headerOffset();
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    });

    let ticking = false;
    const updateFromScroll = () => {
      const offset = headerOffset();
      let current = panels[0];

      panels.forEach((panel) => {
        if (panel.getBoundingClientRect().top - offset <= 24) {
          current = panel;
        }
      });

      if (current) setActive(current.dataset.panel);
    };

    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          updateFromScroll();
          ticking = false;
        });
      },
      { passive: true }
    );
  });
});

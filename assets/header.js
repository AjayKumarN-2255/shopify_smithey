document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const announcementBar = document.querySelector('.announcement-bar');
    const megaMenuContainer = document.querySelector('.mega-menu-container');
    const mobileMenu = document.querySelector('.mobile-menu__nav');
    const cartDrawer = document.querySelector('.cart-drawer');

    const syncBodyScroll = () => {
        const megaOpen = megaMenuContainer?.classList.contains('mega-menu-container--open');
        const mobileOpen = mobileMenu?.classList.contains('mobile-menu--open');
        const cartOpen = cartDrawer?.classList.contains('is-open');

        document.body.classList.toggle('no-scroll', Boolean(megaOpen || mobileOpen || cartOpen));
    };

    if (!header || !announcementBar) return;

    // Enter once past the announcement; exit only at the top.
    // Hiding the bar reduces scrollY — a single threshold caused rapid
    // add/remove of header--scrolled (menu bar blink while scrolling).
    const enterAt = announcementBar.offsetHeight;
    const exitAt = 1;
    let isScrolled = false;

    const setScrolled = (scrolled) => {
        if (scrolled === isScrolled) return;
        isScrolled = scrolled;
        header.classList.toggle('header--scrolled', scrolled);
        announcementBar.style.display = scrolled ? 'none' : '';
    };

    window.addEventListener(
        'scroll',
        () => {
            const y = window.scrollY;
            if (!isScrolled && y > enterAt) {
                setScrolled(true);
            } else if (isScrolled && y <= exitAt) {
                setScrolled(false);
            }
        },
        { passive: true }
    );

    // mobile hamburger controll
    const hamburger = document.querySelector('.hamberger-menu');
    const closeIcon = document.querySelector('.hamberger-close-menu');

    if (hamburger && closeIcon && mobileMenu) {
        hamburger.addEventListener('click', () => {
            window.scrollTo({
                top: enterAt + 1,
                behavior: 'smooth'
            });

            setScrolled(true);

            mobileMenu.classList.add('mobile-menu--open');
            hamburger.style.display = 'none';
            closeIcon.style.display = 'block';
            syncBodyScroll();
        });

        closeIcon.addEventListener('click', () => {
            mobileMenu.classList.remove('mobile-menu--open');
            closeIcon.style.display = 'none';
            hamburger.style.display = 'block';
            syncBodyScroll();
        });
    }

    // open mega menu based on each click
    const triggers = document.querySelectorAll('[data-menu-trigger]');
    const megaMenus = document.querySelectorAll('.mega-menu');

    if (megaMenuContainer) {
        triggers.forEach((trigger) => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();

                const menuName = trigger.dataset.menuTrigger;
                const activeMenu = document.querySelector('.mega-menu--active');

                if (
                    megaMenuContainer.classList.contains('mega-menu-container--open') &&
                    activeMenu &&
                    activeMenu.dataset.menu === menuName
                ) {
                    megaMenuContainer.classList.remove('mega-menu-container--open');
                    header.classList.remove('site-header--mega-open');

                    activeMenu.classList.remove('mega-menu--active');
                    triggers.forEach((t) => t.classList.remove('is-active'));
                    syncBodyScroll();
                    return;
                }

                megaMenuContainer.classList.add('mega-menu-container--open');
                header.classList.add('site-header--mega-open');

                triggers.forEach((t) => {
                    t.classList.toggle('is-active', t.dataset.menuTrigger === menuName);
                });

                megaMenus.forEach((menu) => {
                    menu.classList.toggle(
                        'mega-menu--active',
                        menu.dataset.menu === menuName
                    );
                });

                syncBodyScroll();
            });
        });
    }


    // mega-menu opening in mobile
    const menuItems = document.querySelectorAll(".mobile-menu__item");

    menuItems.forEach((item) => {
        const trigger = item.querySelector(".mobile-menu_right__link");
        const menu = item.querySelector(".mega-menu-mobile");

        if (!trigger || !menu) return;

        trigger.addEventListener("click", (e) => {
            e.preventDefault();

            item.classList.toggle("is-open");
            menu.style.maxHeight = item.classList.contains("is-open")
                ? `${menu.scrollHeight}px`
                : "0";
        });
    });

    const cartIcon = document.querySelector('.header-cart__icon');
    const cartOverlay = document.querySelector('.cart-drawer-overlay');
    const cartClose = document.querySelector('.cart-drawer__close');

    if (cartIcon && cartDrawer && cartOverlay && cartClose) {
        cartIcon.addEventListener('click', () => {
            cartDrawer.classList.add('is-open');
            cartOverlay.classList.add('is-open');
            syncBodyScroll();
        });

        cartOverlay.addEventListener('click', () => {
            cartDrawer.classList.remove('is-open');
            cartOverlay.classList.remove('is-open');
            syncBodyScroll();
        });

        cartClose.addEventListener('click', () => {
            cartDrawer.classList.remove('is-open');
            cartOverlay.classList.remove('is-open');
            syncBodyScroll();
        });
    }
});
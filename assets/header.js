document.addEventListener('DOMContentLoaded', () => {
    // header sticky thing
    const header = document.querySelector('.site-header');
    const announcementBar = document.querySelector('.announcement-bar');

    if (!header || !announcementBar) return;

    const triggerHeight = header.offsetHeight;
    let isScrolled = false;

    window.addEventListener('scroll', () => {
        if (window.scrollY > triggerHeight && !isScrolled) {
            header.classList.add('header--scrolled');
            announcementBar.style.display = 'none';
            isScrolled = true;
        } else if (window.scrollY <= triggerHeight && isScrolled) {
            header.classList.remove('header--scrolled');
            announcementBar.style.display = 'block';
            isScrolled = false;
        }
    });

    // mobile hamburger controll
    const hamburger = document.querySelector('.hamberger-menu');
    const closeIcon = document.querySelector('.hamberger-close-menu');
    const mobileMenu = document.querySelector('.mobile-menu__nav');

    if (!hamburger || !closeIcon || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
        window.scrollTo({
            top: triggerHeight + 1,
            behavior: 'smooth'
        });

        header.classList.add('header--scrolled');
        announcementBar.style.display = 'none';
        isScrolled = true;

        mobileMenu.classList.add('mobile-menu--open');
        hamburger.style.display = 'none';
        closeIcon.style.display = 'block';
    });

    // close mobile menu
    closeIcon.addEventListener('click', () => {
        mobileMenu.classList.remove('mobile-menu--open');

        closeIcon.style.display = 'none';
        hamburger.style.display = 'block';
    });

    // open mega menu based on each click
    const triggers = document.querySelectorAll('[data-menu-trigger]');
    const megaMenuContainer = document.querySelector('.mega-menu-container');
    const megaMenus = document.querySelectorAll('.mega-menu');

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
                document.body.classList.remove('no-scroll');

                activeMenu.classList.remove('mega-menu--active');
                return;
            }

            megaMenuContainer.classList.add('mega-menu-container--open');
            header.classList.add('site-header--mega-open');
            document.body.classList.add('no-scroll');

            megaMenus.forEach((menu) => {
                menu.classList.toggle(
                    'mega-menu--active',
                    menu.dataset.menu === menuName
                );
            });
        });
    });
});
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

    closeIcon.addEventListener('click', () => {
        mobileMenu.classList.remove('mobile-menu--open');

        closeIcon.style.display = 'none';
        hamburger.style.display = 'block';
    });
});
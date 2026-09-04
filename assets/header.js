document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const announcementBar = document.querySelector('.announcement-bar');
    const megaMenuContainer = document.querySelector('.mega-menu-container');
    const mobileMenu = document.querySelector('.mobile-menu__nav');
    const cartDrawer = document.querySelector('.cart-drawer');
    const searchRoot = document.querySelector('[data-header-search]');
    const searchOpenBtn = document.querySelector('[data-search-open]');
    const searchInput = searchRoot?.querySelector('[data-search-input]');
    const suggestedList = searchRoot?.querySelector('[data-suggested-searches]');
    const suggestedColumn = searchRoot?.querySelector('[data-suggested-column]');

    const syncBodyScroll = () => {
        const megaOpen = megaMenuContainer?.classList.contains('mega-menu-container--open');
        const mobileOpen = mobileMenu?.classList.contains('mobile-menu--open');
        const cartOpen = cartDrawer?.classList.contains('is-open');
        const searchOpen = header?.classList.contains('is-search-open');

        document.body.classList.toggle(
            'no-scroll',
            Boolean(megaOpen || mobileOpen || cartOpen || searchOpen)
        );
    };

    const closeMegaMenu = () => {
        if (!megaMenuContainer) return;

        megaMenuContainer.classList.remove('mega-menu-container--open');
        header?.classList.remove('site-header--mega-open');
        document.querySelectorAll('.mega-menu--active').forEach((menu) => {
            menu.classList.remove('mega-menu--active');
        });
        document.querySelectorAll('[data-menu-trigger].is-active').forEach((trigger) => {
            trigger.classList.remove('is-active');
        });
    };

    const closeMobileMenu = () => {
        const hamburger = document.querySelector('.hamberger-menu');
        const closeIcon = document.querySelector('.hamberger-close-menu');

        if (!mobileMenu?.classList.contains('mobile-menu--open')) return;

        mobileMenu.classList.remove('mobile-menu--open');
        if (closeIcon) closeIcon.style.display = 'none';
        if (hamburger) hamburger.style.display = 'block';
    };

    const isSearchOpen = () => Boolean(header?.classList.contains('is-search-open'));

    const escapeHtml = (value) =>
        String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const setSuggestedVisible = (visible) => {
        if (!suggestedColumn) return;
        suggestedColumn.hidden = !visible;
    };

    const clearSuggestedSearches = () => {
        if (!suggestedList) return;
        suggestedList.innerHTML = '';
        setSuggestedVisible(false);
    };

    const renderSuggestedSearches = (items) => {
        if (!suggestedList || !searchRoot) return;

        const searchUrl = searchRoot.dataset.searchUrl || '/search';

        if (!items.length) {
            clearSuggestedSearches();
            return;
        }

        suggestedList.innerHTML = items
            .map((item) => {
                const href = item.url || `${searchUrl}?q=${encodeURIComponent(item.text)}`;
                return `<li><a class="header-search__link" href="${escapeHtml(href)}">${escapeHtml(item.text)}</a></li>`;
            })
            .join('');

        setSuggestedVisible(true);
    };

    let searchAbortController = null;
    let searchDebounceTimer = null;

    const fetchSuggestedSearches = (query) => {
        if (!searchRoot || !suggestedList) return;

        const trimmed = query.trim();

        if (trimmed.length < 2) {
            clearSuggestedSearches();
            return;
        }

        const predictiveUrl = searchRoot.dataset.predictiveUrl || '/search/suggest';
        const params = new URLSearchParams({
            q: trimmed,
            'resources[type]': 'query,product',
            'resources[limit]': '8',
            'resources[limit_scope]': 'each'
        });

        if (searchAbortController) {
            searchAbortController.abort();
        }

        searchAbortController = new AbortController();
        setSuggestedVisible(false);

        const jsonUrl = predictiveUrl.includes('.json')
            ? `${predictiveUrl}?${params.toString()}`
            : `${predictiveUrl.replace(/\/?$/, '')}.json?${params.toString()}`;

        fetch(jsonUrl, {
            signal: searchAbortController.signal,
            headers: { Accept: 'application/json' }
        })
            .then((response) => {
                if (!response.ok) throw new Error('Search request failed');
                return response.json();
            })
            .then((data) => {
                const resources = data?.resources?.results || {};
                const queries = Array.isArray(resources.queries) ? resources.queries : [];
                const products = Array.isArray(resources.products) ? resources.products : [];

                const fromQueries = queries
                    .map((item) => ({
                        text: item.text || item.title || '',
                        url: item.url || ''
                    }))
                    .filter((item) => item.text);

                const fromProducts = products
                    .map((item) => ({
                        text: item.title || '',
                        url: item.url || ''
                    }))
                    .filter((item) => item.text);

                const seen = new Set();
                const combined = [...fromQueries, ...fromProducts].filter((item) => {
                    const key = item.text.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                renderSuggestedSearches(combined.slice(0, 8));
            })
            .catch((error) => {
                if (error.name === 'AbortError') return;
                clearSuggestedSearches();
            });
    };

    const openSearch = () => {
        if (!header || isSearchOpen()) return;

        closeMegaMenu();
        closeMobileMenu();

        header.classList.add('is-search-open');
        document.body.classList.add('is-search-open');
        if (announcementBar) {
            announcementBar.style.display = 'none';
        }
        if (searchOpenBtn) {
            searchOpenBtn.setAttribute('aria-expanded', 'true');
            searchOpenBtn.setAttribute('aria-label', 'Close search');
        }
        if (searchRoot) searchRoot.setAttribute('aria-hidden', 'false');

        syncBodyScroll();

        window.requestAnimationFrame(() => {
            searchInput?.focus();
            if (searchInput?.value) {
                fetchSuggestedSearches(searchInput.value);
            }
        });
    };

    const closeSearch = () => {
        if (!header || !isSearchOpen()) return;

        header.classList.remove('is-search-open');
        document.body.classList.remove('is-search-open');
        if (announcementBar && !header.classList.contains('header--scrolled')) {
            announcementBar.style.display = '';
        }
        if (searchOpenBtn) {
            searchOpenBtn.setAttribute('aria-expanded', 'false');
            searchOpenBtn.setAttribute('aria-label', 'Search');
        }
        if (searchRoot) searchRoot.setAttribute('aria-hidden', 'true');

        if (searchAbortController) {
            searchAbortController.abort();
            searchAbortController = null;
        }

        clearTimeout(searchDebounceTimer);
        clearSuggestedSearches();
        syncBodyScroll();
        searchOpenBtn?.focus();
    };

    if (searchOpenBtn && searchRoot) {
        searchOpenBtn.addEventListener('click', (event) => {
            event.preventDefault();

            if (isSearchOpen()) {
                closeSearch();
                return;
            }

            openSearch();
        });

        searchRoot.querySelectorAll('[data-search-close]').forEach((el) => {
            el.addEventListener('click', closeSearch);
        });

        searchInput?.addEventListener('input', (event) => {
            const value = event.target.value || '';

            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                fetchSuggestedSearches(value);
            }, 250);
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isSearchOpen()) {
            closeSearch();
        }
    });

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
        if (!isSearchOpen()) {
            announcementBar.style.display = scrolled ? 'none' : '';
        }
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
            if (isSearchOpen()) closeSearch();

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

                if (isSearchOpen()) closeSearch();

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
    const menuItems = document.querySelectorAll('.mobile-menu__item');

    menuItems.forEach((item) => {
        const trigger = item.querySelector('.mobile-menu_right__link');
        const menu = item.querySelector('.mega-menu-mobile');

        if (!trigger || !menu) return;

        trigger.addEventListener('click', (e) => {
            e.preventDefault();

            item.classList.toggle('is-open');
            menu.style.maxHeight = item.classList.contains('is-open')
                ? `${menu.scrollHeight}px`
                : '0';
        });
    });

    const cartIcon = document.querySelector('.header-cart__icon');
    const cartOverlay = document.querySelector('.cart-drawer-overlay');
    const cartClose = document.querySelector('.cart-drawer__close');

    if (cartIcon && cartDrawer && cartOverlay && cartClose) {
        cartIcon.addEventListener('click', () => {
            if (isSearchOpen()) closeSearch();

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

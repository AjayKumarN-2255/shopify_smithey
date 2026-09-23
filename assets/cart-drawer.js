document.addEventListener('DOMContentLoaded', () => {

    // recommendation card sliding code 
    const slider = document.querySelector(
        '.cart-drawer__recommendations-list'
    );
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;

        e.preventDefault();

        const x = e.pageX - slider.offsetLeft;
        const walk = x - startX;

        slider.scrollLeft = scrollLeft - walk;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;

    const itemTemplate = document.getElementById('cart-drawer-item-template');
    const moneyFormat = drawer.dataset.moneyFormat || '${{amount}}';
    const root = window.Shopify?.routes?.root || '/';
    const cartChangeUrl = `${root}cart/change`;

    let isRequesting = false;

    const overlay = document.getElementById('cart-drawer-overlay');

    function openCartDrawer() {
        if (!drawer || !overlay) return;

        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
        document.body.classList.add('no-scroll');
    }

    function closeCartDrawer() {
        if (!drawer || !overlay) return;

        drawer.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
    }

    window.SmitheyCart = {
        open: openCartDrawer,
        close: closeCartDrawer,
        addItems(items) {
            return runCartRequest(() => addItemsToCart(items), { openDrawer: true }).then((cart) => {
                if (!cart) {
                    throw new Error('Unable to add this bundle to the cart.');
                }
                return cart;
            });
        }
    };

    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;

    function defaultOption(opt, def) {
        return typeof opt === 'undefined' ? def : opt;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = defaultOption(precision, 2);
        thousands = defaultOption(thousands, ',');
        decimal = defaultOption(decimal, '.');

        if (isNaN(number) || number == null) return '0';

        const parts = (number / 100.0).toFixed(precision).split('.');
        const dollarsAmount = parts[0].replace(
            /(\d)(?=(\d\d\d)+(?!\d))/g,
            '$1' + thousands
        );
        const centsAmount = parts[1] ? decimal + parts[1] : '';

        return dollarsAmount + centsAmount;
    }

    function formatMoney(cents) {
        if (typeof cents === 'string') {
            cents = cents.replace('.', '');
        }

        const formatString = moneyFormat;
        const placeholder = formatString.match(placeholderRegex);
        let value = '';

        switch (placeholder ? placeholder[1] : 'amount') {
            case 'amount_no_decimals':
                value = formatWithDelimiters(cents, 0);
                break;
            case 'amount_with_comma_separator':
                value = formatWithDelimiters(cents, 2, '.', ',');
                break;
            case 'amount_no_decimals_with_comma_separator':
                value = formatWithDelimiters(cents, 0, '.', ',');
                break;
            case 'amount_with_apostrophe_separator':
                value = formatWithDelimiters(cents, 2, "'", '.');
                break;
            case 'amount_no_decimals_with_space_separator':
                value = formatWithDelimiters(cents, 0, ' ');
                break;
            case 'amount_with_space_separator':
                value = formatWithDelimiters(cents, 2, ' ', ',');
                break;
            case 'amount_with_period_and_space_separator':
                value = formatWithDelimiters(cents, 2, ' ', '.');
                break;
            default:
                value = formatWithDelimiters(cents, 2);
        }

        return formatString.replace(placeholderRegex, value);
    }

    function getErrorElement() {
        return drawer.querySelector('[data-cart-error]');
    }

    function showError(message) {
        const errorEl = getErrorElement();
        if (!errorEl) {
            window.alert(message);
            return;
        }

        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    function clearError() {
        const errorEl = getErrorElement();
        if (!errorEl) return;

        errorEl.textContent = '';
        errorEl.hidden = true;
    }

    function cartApiUrl(path) {
        return `${root}${path}`;
    }

    function setControlsBusy(busy) {
        drawer.querySelectorAll(
            '.cart-drawer__add-button, button.cart-drawer__remove, .cart-drawer__quantity-button, [data-gift-note-save], [data-gift-note-cancel], [data-gift-note-open]'
        ).forEach((button) => {
            button.disabled = busy;
            button.setAttribute('aria-busy', busy ? 'true' : 'false');
        });

        drawer.querySelectorAll('a.cart-drawer__remove').forEach((link) => {
            link.setAttribute('aria-disabled', busy ? 'true' : 'false');
            link.style.pointerEvents = busy ? 'none' : '';
        });
    }

    function getMinusButton(itemEl) {
        return (
            itemEl.querySelector('[data-quantity-change="-1"]') ||
            itemEl.querySelector('.cart-drawer__quantity-button')
        );
    }

    function syncQuantityButtons(itemEl, quantity) {
        const minusButton = getMinusButton(itemEl);
        if (minusButton) {
            minusButton.disabled = quantity <= 1;
        }
    }

    async function parseCartResponse(response) {
        const text = await response.text();
        let data = {};

        try {
            data = text ? JSON.parse(text) : {};
        } catch (error) {
            console.error('Cart AJAX response was not JSON', response.status, response.url, text);
            const parseError = new Error('Something went wrong. Please try again.');
            parseError.cause = error;
            throw parseError;
        }

        if (!response.ok) {
            console.error('Cart AJAX request failed', response.status, response.url, data);
            throw new Error(
                data.description ||
                data.message ||
                'Something went wrong. Please try again.'
            );
        }

        return data;
    }

    async function fetchCart() {
        const response = await fetch(cartApiUrl('cart.js'), {
            headers: { Accept: 'application/json' }
        });

        return parseCartResponse(response);
    }

    async function addToCart(variantId) {
        const response = await fetch(cartApiUrl('cart/add.js'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                id: Number(variantId),
                quantity: 1
            })
        });

        await parseCartResponse(response);
        return fetchCart();
    }

    async function addItemsToCart(items) {
        const response = await fetch(cartApiUrl('cart/add.js'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ items })
        });

        await parseCartResponse(response);
        return fetchCart();
    }

    async function changeCartItem(lineKey, quantity) {
        const response = await fetch(cartApiUrl('cart/change.js'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                id: lineKey,
                quantity: Number(quantity)
            })
        });

        await parseCartResponse(response);
        return fetchCart();
    }

    function createCartItem(item) {
        if (!itemTemplate) return null;

        const node = itemTemplate.content.firstElementChild.cloneNode(true);
        const imageWrap = node.querySelector('.cart-drawer__item-image');
        const image = node.querySelector('.cart-drawer__item-image img');
        const title = node.querySelector('.cart-drawer__item-title');
        const price = node.querySelector('.cart-drawer__item-price');
        const quantity = node.querySelector('.cart-drawer__quantity-value');
        const removeLink = node.querySelector('a.cart-drawer__remove');
        const imageUrl = item.image || item.featured_image?.url || '';
        const imageAlt = item.featured_image?.alt || item.product_title || '';

        node.dataset.lineKey = item.key;
        node.dataset.variantId = String(item.variant_id);
        node.dataset.productId = String(item.product_id);
        syncBundleMeta(node, item);

        if (image && imageUrl) {
            image.src = imageUrl;
            image.alt = imageAlt;
        } else if (imageWrap) {
            imageWrap.innerHTML = '';
        }

        if (title) title.textContent = item.product_title || item.title || '';
        if (price) price.textContent = formatMoney(item.final_line_price);
        if (quantity) quantity.textContent = String(item.quantity);

        if (removeLink) {
            removeLink.dataset.lineKey = item.key;
            removeLink.href = `${cartChangeUrl}?id=${encodeURIComponent(item.key)}&quantity=0`;
        }

        syncQuantityButtons(node, item.quantity);

        return node;
    }

    function updateCartItemElement(element, item) {
        const price = element.querySelector('.cart-drawer__item-price');
        const quantity = element.querySelector('.cart-drawer__quantity-value');
        const removeLink = element.querySelector('a.cart-drawer__remove');

        element.dataset.lineKey = item.key;
        element.dataset.variantId = String(item.variant_id);
        element.dataset.productId = String(item.product_id);
        syncBundleMeta(element, item);

        if (price) price.textContent = formatMoney(item.final_line_price);
        if (quantity) quantity.textContent = String(item.quantity);

        if (removeLink) {
            removeLink.dataset.lineKey = item.key;
            removeLink.href = `${cartChangeUrl}?id=${encodeURIComponent(item.key)}&quantity=0`;
        }

        syncQuantityButtons(element, item.quantity);
    }

    function setEmptyState(isEmpty) {
        const emptyEl = drawer.querySelector('.cart-drawer__empty');
        const itemsEl = drawer.querySelector('.cart-drawer__items');
        const giftEl = drawer.querySelector('.cart-drawer__gift-note');
        const footerEl = drawer.querySelector('.cart-drawer__footer');
        const recList = drawer.querySelector('.cart-drawer__recommendations-list');

        if (emptyEl) emptyEl.hidden = !isEmpty;
        if (itemsEl) itemsEl.hidden = isEmpty;
        if (giftEl) giftEl.hidden = isEmpty;
        if (footerEl) footerEl.hidden = isEmpty;

        if (recList) {
            recList.classList.toggle('flex-1', !isEmpty);
        }
    }

    function syncRecommendations(cart) {
        const productIds = new Set(
            (cart.items || []).map((item) => String(item.product_id))
        );

        drawer.querySelectorAll('.cart-drawer__recommendation').forEach((rec) => {
            rec.hidden = productIds.has(String(rec.dataset.productId));
        });
    }

    function isCartState(cart) {
        return Boolean(cart && Array.isArray(cart.items));
    }

    function syncCartIndicator(cart) {
        const hasItems = (cart.item_count || 0) > 0;
        document.querySelectorAll('[data-cart-indicator]').forEach((indicator) => {
            indicator.classList.toggle('is-hidden', !hasItems);
        });
    }

    function renderCart(cart) {
        if (!isCartState(cart)) {
            console.error('Unexpected cart payload; skipped UI update', cart);
            return;
        }

        const countEl = drawer.querySelector('[data-cart-count]');
        const subtotalEl = drawer.querySelector('[data-cart-subtotal]');
        const itemsEl = drawer.querySelector('.cart-drawer__items');

        if (countEl) countEl.textContent = String(cart.item_count || 0);
        syncCartIndicator(cart);

        if (giftNoteInput && typeof cart.note === 'string') {
            savedGiftNote = cart.note;
        }

        if (!cart.item_count) {
            if (itemsEl) itemsEl.innerHTML = '';
            if (subtotalEl) subtotalEl.textContent = formatMoney(0);
            setEmptyState(true);
            syncRecommendations(cart);
            return;
        }

        setEmptyState(false);

        if (!itemsEl) return;

        const existingItems = Array.from(
            itemsEl.querySelectorAll('.cart-drawer__item')
        );
        const remaining = new Map(
            existingItems.map((el) => [el.dataset.lineKey, el])
        );

        cart.items.forEach((item) => {
            let element = remaining.get(item.key);

            if (!element) {
                element = existingItems.find(
                    (el) =>
                        remaining.has(el.dataset.lineKey) &&
                        el.dataset.variantId === String(item.variant_id)
                );
            }

            if (element) {
                const previousKey = element.dataset.lineKey;
                updateCartItemElement(element, item);
                remaining.delete(previousKey);
                itemsEl.appendChild(element);
                return;
            }

            const created = createCartItem(item);
            if (created) itemsEl.appendChild(created);
        });

        remaining.forEach((element) => element.remove());
        groupBundleItems(itemsEl);
        syncRecommendations(cart);
    }

    function syncBundleMeta(node, item) {
        const properties = item.properties || {};
        node.dataset.bundleId = properties._Bundle_ID || '';
        node.dataset.bundleName = properties._Bundle || '';
        node.dataset.bundleSavings = properties._Bundle_Savings || '0';
        node.dataset.linePrice = String(item.final_line_price || 0);

        let engraving = node.querySelector('.cart-drawer__item-engraving');
        const text = properties.Engraving || '';

        if (text) {
            if (!engraving) {
                engraving = document.createElement('p');
                engraving.className = 'cart-drawer__item-engraving';
                node.querySelector('.cart-drawer__item-title')?.after(engraving);
            }
            engraving.textContent = text;
        } else if (engraving) {
            engraving.remove();
        }
    }

    function bundleTiers() {
        const defaults = [
            { amount: 27500, savings: 5000 },
            { amount: 42500, savings: 7500 },
            { amount: 54000, savings: 12500 }
        ];
        const configNode = document.querySelector('[data-bundle-config]');
        if (!configNode) return defaults;

        try {
            const config = JSON.parse(configNode.textContent);
            if (Array.isArray(config.tiers) && config.tiers.length) {
                return [...config.tiers].sort((left, right) => left.amount - right.amount);
            }
        } catch (error) {
            console.error('Bundle tier config is invalid', error);
        }

        return defaults;
    }

    function savingsForBundleTotal(total) {
        let unlocked = 0;

        bundleTiers().forEach((tier) => {
            if (total >= Number(tier.amount)) unlocked = Number(tier.savings);
        });

        return unlocked;
    }

    function discountedLinePrices(prices, savings) {
        const sum = prices.reduce((total, price) => total + price, 0);
        if (!savings || !sum) return prices;

        const capped = Math.min(savings, sum);
        let remaining = capped;

        return prices.map((price, index) => {
            if (index === prices.length - 1) {
                return Math.max(price - remaining, 0);
            }

            const share = Math.min(Math.round((price / sum) * capped), remaining, price);
            remaining -= share;
            return price - share;
        });
    }

    function applyBundleLinePrices(nodes) {
        const prices = nodes.map((node) => parseInt(node.dataset.linePrice, 10) || 0);
        const sum = prices.reduce((total, price) => total + price, 0);
        const savings = savingsForBundleTotal(sum);
        const discounted = discountedLinePrices(prices, savings);

        nodes.forEach((node, index) => {
            const priceEl = node.querySelector('.cart-drawer__item-price');
            if (priceEl) priceEl.textContent = formatMoney(discounted[index]);
        });

        return discounted.reduce((total, price) => total + price, 0);
    }

    function updateDisplayedSubtotal(itemsEl) {
        const subtotalEl = drawer.querySelector('[data-cart-subtotal]');
        if (!subtotalEl || !itemsEl) return;

        const groups = new Map();
        let total = 0;

        itemsEl.querySelectorAll('.cart-drawer__item').forEach((node) => {
            const price = parseInt(node.dataset.linePrice, 10) || 0;
            const bundleId = node.dataset.bundleId || '';

            if (!bundleId) {
                total += price;
                return;
            }

            if (!groups.has(bundleId)) {
                groups.set(bundleId, { sum: 0 });
            }

            groups.get(bundleId).sum += price;
        });

        groups.forEach((group) => {
            total += Math.max(group.sum - savingsForBundleTotal(group.sum), 0);
        });

        subtotalEl.textContent = formatMoney(Math.max(total, 0));
    }

    function groupBundleItems(itemsEl) {
        if (!itemsEl) return;

        itemsEl.querySelectorAll('[data-bundle-label], [data-bundle-total]').forEach((node) => node.remove());

        const itemNodes = Array.from(itemsEl.querySelectorAll('.cart-drawer__item'));
        let previousId = '';
        let groupNodes = [];
        let lastNode = null;

        const flushGroup = () => {
            if (!previousId || !groupNodes.length || !lastNode) return;

            const bundlePrice = applyBundleLinePrices(groupNodes);
            const total = document.createElement('p');
            total.className = 'cart-drawer__bundle-total';
            total.dataset.bundleTotal = previousId;

            const label = document.createElement('span');
            label.textContent = 'Bundle total';

            const value = document.createElement('span');
            value.textContent = formatMoney(bundlePrice);

            total.append(label, value);
            lastNode.after(total);
        };

        itemNodes.forEach((node) => {
            const bundleId = node.dataset.bundleId || '';
            node.classList.toggle('is-bundled', Boolean(bundleId));

            if (bundleId !== previousId) {
                flushGroup();
                previousId = bundleId;
                groupNodes = [];
                lastNode = null;

                if (bundleId) {
                    const label = document.createElement('p');
                    label.className = 'cart-drawer__bundle-label';
                    label.dataset.bundleLabel = bundleId;
                    label.textContent = node.dataset.bundleName || 'Your Bundle';
                    node.before(label);
                }
            }

            if (bundleId) {
                groupNodes.push(node);
                lastNode = node;
            }
        });

        flushGroup();
        updateDisplayedSubtotal(itemsEl);
    }

    async function runCartRequest(request, options = {}) {
        if (isRequesting) return Promise.resolve(null);

        isRequesting = true;
        clearError();
        setControlsBusy(true);

        try {
            const cart = await request();

            try {
                renderCart(cart);
            } catch (uiError) {
                console.error('Cart UI update failed after successful AJAX request', uiError, cart);
            }

            if (options.openDrawer) {
                openCartDrawer();
            }

            return cart;
        } catch (error) {
            console.error('Cart AJAX request failed', error);

            if (options.openDrawer) {
                openCartDrawer();
            }

            showError(error.message || 'Something went wrong. Please try again.');
            return null;
        } finally {
            setControlsBusy(false);
            drawer.querySelectorAll('.cart-drawer__item').forEach((itemEl) => {
                const quantity = parseInt(
                    itemEl.querySelector('.cart-drawer__quantity-value')?.textContent,
                    10
                ) || 1;
                syncQuantityButtons(itemEl, quantity);
            });
            isRequesting = false;
        }
    }

    document.addEventListener('submit', (event) => {
        const form = event.target.closest('form[action*="/cart/add"]');
        if (!form) return;

        event.preventDefault();

        const variantInput = form.querySelector('[name="id"]');
        const variantId = variantInput && variantInput.value;

        if (!variantId) {
            showError('Unable to add this product to the cart.');
            return;
        }

        runCartRequest(() => addToCart(variantId), { openDrawer: true });
    });

    overlay?.addEventListener('click', closeCartDrawer);

    drawer.querySelector('.cart-drawer__close')?.addEventListener('click', closeCartDrawer);

    drawer.addEventListener('click', (event) => {
        const quantityButton = event.target.closest('.cart-drawer__quantity-button');
        if (quantityButton && drawer.contains(quantityButton)) {
            event.preventDefault();

            const itemEl = quantityButton.closest('.cart-drawer__item');
            if (!itemEl) return;

            const lineKey = itemEl.dataset.lineKey;
            const currentQuantity = parseInt(
                itemEl.querySelector('.cart-drawer__quantity-value')?.textContent,
                10
            ) || 1;
            const delta = Number(
                quantityButton.dataset.quantityChange ||
                (quantityButton.textContent.trim() === '+' ? 1 : -1)
            );

            if (!lineKey || !delta) return;
            if (delta < 0 && currentQuantity <= 1) return;

            runCartRequest(() => changeCartItem(lineKey, currentQuantity + delta));
            return;
        }

        const removeLink = event.target.closest('a.cart-drawer__remove');
        const removeButton = event.target.closest('button.cart-drawer__remove');
        if (!removeLink && !removeButton) return;
        if (!drawer.contains(removeLink || removeButton)) return;

        event.preventDefault();

        const link = removeLink || removeButton.querySelector('a.cart-drawer__remove');
        const itemEl = (link || removeButton).closest('.cart-drawer__item');
        const lineKey =
            (link && link.dataset.lineKey) ||
            (itemEl && itemEl.dataset.lineKey);

        if (!lineKey) {
            showError('Unable to remove this item from the cart.');
            return;
        }

        runCartRequest(() => changeCartItem(lineKey, 0));
    });

    const giftNoteRoot = drawer.querySelector('[data-gift-note]');
    const giftNoteOpen = drawer.querySelector('[data-gift-note-open]');
    const giftNoteForm = drawer.querySelector('[data-gift-note-form]');
    const giftNoteInput = drawer.querySelector('[data-gift-note-input]');
    const giftNoteCount = drawer.querySelector('[data-gift-note-count]');
    const giftNoteSave = drawer.querySelector('[data-gift-note-save]');
    const giftNoteCancel = drawer.querySelector('[data-gift-note-cancel]');
    const giftNoteMax = 450;
    const giftNoteCloseDelay = 400;
    let savedGiftNote = giftNoteInput ? giftNoteInput.value : '';
    let giftNoteCloseTimer = null;

    function updateGiftNoteCount() {
        if (!giftNoteInput || !giftNoteCount) return;
        const length = giftNoteInput.value.length;
        giftNoteCount.textContent = `${length}/${giftNoteMax}`;
    }

    function clearGiftNoteField() {
        if (!giftNoteInput) return;
        giftNoteInput.value = '';
        updateGiftNoteCount();
    }

    function openGiftNoteForm() {
        if (!giftNoteOpen || !giftNoteForm || !giftNoteInput) return;
        if (giftNoteCloseTimer) {
            clearTimeout(giftNoteCloseTimer);
            giftNoteCloseTimer = null;
        }
        giftNoteOpen.hidden = true;
        giftNoteForm.hidden = false;
        giftNoteInput.value = '';
        updateGiftNoteCount();
        giftNoteInput.focus();
    }

    function closeGiftNoteForm({ clearField = true, delay = giftNoteCloseDelay } = {}) {
        if (!giftNoteOpen || !giftNoteForm || !giftNoteInput) return;

        if (giftNoteCloseTimer) {
            clearTimeout(giftNoteCloseTimer);
            giftNoteCloseTimer = null;
        }

        giftNoteCloseTimer = setTimeout(() => {
            if (clearField) clearGiftNoteField();
            giftNoteForm.hidden = true;
            giftNoteOpen.hidden = false;
            giftNoteCloseTimer = null;
        }, delay);
    }

    async function updateCartNote(note) {
        const response = await fetch(cartApiUrl('cart/update.js'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ note })
        });

        return parseCartResponse(response);
    }

    if (giftNoteRoot && giftNoteOpen && giftNoteForm && giftNoteInput) {
        updateGiftNoteCount();

        giftNoteOpen.addEventListener('click', openGiftNoteForm);

        giftNoteInput.addEventListener('input', updateGiftNoteCount);

        giftNoteCancel?.addEventListener('click', () => {
            closeGiftNoteForm({ clearField: true });
        });

        giftNoteSave?.addEventListener('click', () => {
            const note = giftNoteInput.value.slice(0, giftNoteMax);

            runCartRequest(async () => {
                const cart = await updateCartNote(note);
                savedGiftNote = note;
                closeGiftNoteForm({ clearField: true });
                return cart;
            });
        });
    }

    groupBundleItems(drawer.querySelector('.cart-drawer__items'));
});
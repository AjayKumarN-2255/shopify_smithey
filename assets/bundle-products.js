document.addEventListener('DOMContentLoaded', () => {
  const siteHeader = document.querySelector('.site-header');

  const syncStickyTop = () => {
    const height =
      siteHeader && siteHeader.classList.contains('header--scrolled')
        ? siteHeader.getBoundingClientRect().height
        : 0;

    document.documentElement.style.setProperty('--bundle-sticky-top', `${height}px`);
  };

  syncStickyTop();
  window.addEventListener('scroll', () => requestAnimationFrame(syncStickyTop), { passive: true });
  window.addEventListener('resize', syncStickyTop);

  document.querySelectorAll('.bundle-products').forEach((section) => {
    initializeBundleTabs(section);
    initializeBundleBuilder(section);
  });
});

function initializeBundleTabs(section) {
  const tabs = [...section.querySelectorAll('.bundle-products__tab')];
  const panels = [...section.querySelectorAll('.bundle-products__panel')];
  const header = section.querySelector('.bundle-products__header');

  if (!tabs.length || !panels.length) return;

  const headerOffset = () => {
    const stickyTop =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bundle-sticky-top')) || 0;

    return stickyTop + (header ? header.getBoundingClientRect().height : 0) + 12;
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
}

const DEFAULT_BUNDLE_TIERS = [
  { amount: 27500, savings: 5000 },
  { amount: 42500, savings: 7500 },
  { amount: 54000, savings: 12500 }
];

function initializeBundleBuilder(section) {
  const summary = section.querySelector('[data-bundle-summary]');
  const configNode = section.querySelector('[data-bundle-config]');
  if (!summary || !configNode) return;

  let config;
  try {
    config = JSON.parse(configNode.textContent);
  } catch (error) {
    console.error('Bundle builder config is invalid', error);
    return;
  }

  const tiers = Array.isArray(config.tiers) && config.tiers.length ? config.tiers : DEFAULT_BUNDLE_TIERS;
  const moneyFormat = String(config.moneyFormat || '${{amount}}').replace(/<[^>]*>/g, '');
  const bundleItems = [];
  const engravingOpen = new Set();
  const addedTimers = new Map();
  let isSubmitting = false;

  const emptyEl = summary.querySelector('[data-bundle-empty]');
  const filledEl = summary.querySelector('[data-bundle-filled]');
  const itemsEl = summary.querySelector('[data-bundle-items]');
  const savingsEl = summary.querySelector('[data-bundle-savings]');
  const savingsMessageEl = summary.querySelector('[data-bundle-savings-message]');
  const sectionsEl = summary.querySelector('[data-bundle-sections]');
  const totalEl = summary.querySelector('[data-bundle-total]');
  const offerEl = summary.querySelector('[data-bundle-offer]');
  const actualEl = summary.querySelector('[data-bundle-actual]');
  const submitButton = summary.querySelector('[data-bundle-submit]');
  const errorEl = summary.querySelector('[data-bundle-error]');

  function formatMoney(cents) {
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const placeholder = moneyFormat.match(placeholderRegex);

    const formatWithDelimiters = (number, precision, thousands, decimal) => {
      const amount = (Number(number) / 100).toFixed(precision).split('.');
      const dollars = amount[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${thousands}`);
      const centsPart = amount[1] ? decimal + amount[1] : '';
      return dollars + centsPart;
    };

    let value = formatWithDelimiters(cents, 2, ',', '.');
    switch (placeholder ? placeholder[1] : 'amount') {
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0, ',', '.');
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
      default:
        break;
    }

    const formatted = placeholder ? moneyFormat.replace(placeholderRegex, value) : value;
    return formatted.replace(/([.,]00)(?!\d)/, '');
  }

  function readProduct(card) {
    const node = card.querySelector('[data-product-json]');
    if (!node) return null;

    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      console.error('Bundle product data is invalid', error);
      return null;
    }
  }

  function selectedVariant(card, product) {
    const select = card.querySelector('[data-variant-select]');
    const variantId = select ? Number(select.value) : product.variants[0] && product.variants[0].id;
    return product.variants.find((variant) => variant.id === variantId) || product.variants[0];
  }

  function findBundleItem(variantId) {
    return bundleItems.find((item) => item.variantId === variantId);
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
  }

  function addProductToBundle(product, variant) {
    if (!variant || !variant.available) return;

    const existing = findBundleItem(variant.id);
    if (existing) {
      updateBundleQuantity(variant.id, existing.quantity + 1);
    } else {
      bundleItems.push({
        productId: product.productId,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title,
        image: variant.image,
        price: variant.price,
        quantity: 1,
        inventory: variant.inventory,
        engraving: ''
      });
      renderBundle();
    }

    showAddedConfirmation(variant.id);
  }

  function showAddedConfirmation(variantId) {
    section.querySelectorAll('.bundle-products__card').forEach((card) => {
      const button = card.querySelector('[data-add-to-bundle]');
      const product = readProduct(card);
      if (!button || !product) return;

      const variant = selectedVariant(card, product);
      if (!variant || variant.id !== variantId) return;

      button.classList.add('is-added');
      button.textContent = '✓ Added to Bundle';

      const pending = addedTimers.get(button);
      if (pending) clearTimeout(pending);

      addedTimers.set(
        button,
        setTimeout(() => {
          addedTimers.delete(button);
          button.classList.remove('is-added');
          button.textContent = config.addLabel || 'Add to Bundle';
        }, 3000)
      );
    });
  }

  function removeProductFromBundle(variantId) {
    const index = bundleItems.findIndex((item) => item.variantId === variantId);
    if (index === -1) return;

    bundleItems.splice(index, 1);
    engravingOpen.delete(variantId);
    renderBundle();
  }

  function updateBundleQuantity(variantId, quantity) {
    const item = findBundleItem(variantId);
    if (!item) return;

    let nextQuantity = Math.max(1, quantity);
    if (typeof item.inventory === 'number') {
      nextQuantity = Math.min(nextQuantity, Math.max(item.inventory, 1));
    }

    item.quantity = nextQuantity;
    renderBundle();
  }

  function setEngraving(variantId, value) {
    const item = findBundleItem(variantId);
    if (!item) return;
    item.engraving = value;
  }

  function calculateBundleTotal() {
    return bundleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function calculateBundleSavings(total) {
    const sorted = [...tiers].sort((left, right) => left.amount - right.amount);
    let previousAmount = 0;

    const sections = sorted.map((tier, index) => {
      const previousReached = index === 0 || total >= sorted[index - 1].amount;
      let state = 'locked';

      if (total >= tier.amount) {
        state = 'completed';
      } else if (previousReached) {
        state = 'active';
      }

      const span = tier.amount - previousAmount;
      let progress = 0;

      if (state === 'completed') {
        progress = 100;
      } else if (state === 'active' && span > 0) {
        progress = ((total - previousAmount) / span) * 100;
      }

      const section = {
        index,
        amount: tier.amount,
        savings: tier.savings,
        state,
        progress: Math.max(0, Math.min(100, progress)),
        remaining: Math.max(tier.amount - total, 0)
      };

      previousAmount = tier.amount;
      return section;
    });

    const active = sections.find((section) => section.state === 'active') || null;
    const completed = sections.filter((section) => section.state === 'completed');

    return {
      tiers: sorted,
      sections,
      active,
      unlocked: completed.length ? completed[completed.length - 1].savings : 0,
      reachedMax: sections.length > 0 && completed.length === sections.length
    };
  }

  function sectionStatusLabel(state) {
    if (state === 'completed') return 'Completed';
    if (state === 'active') return 'Active';
    return 'Locked';
  }

  function renderSavingsSection(section) {
    const item = document.createElement('div');
    item.className = `bundle-summary__section is-${section.state}`;
    item.setAttribute(
      'aria-label',
      `Section ${section.index + 1}, save ${formatMoney(section.savings)}, ${sectionStatusLabel(section.state)}`
    );

    const track = document.createElement('span');
    track.className = 'bundle-summary__progress-segment';

    const fill = document.createElement('span');
    fill.className = 'bundle-summary__progress-fill';
    fill.style.width = `${section.progress}%`;
    track.append(fill);

    item.append(track);
    return item;
  }

  function updateSavingsProgress(total) {
    const savings = calculateBundleSavings(total);
    if (!savingsEl || !savingsMessageEl) return savings;

    if (!savings.sections.length || !bundleItems.length || savings.reachedMax) {
      savingsEl.hidden = true;
      return savings;
    }

    savingsEl.hidden = false;
    savingsMessageEl.classList.remove('is-complete');
    savingsMessageEl.textContent = savings.active
      ? `Spend ${formatMoney(savings.active.remaining)} more to save ${formatMoney(savings.active.savings)}`
      : '';

    if (sectionsEl) {
      sectionsEl.replaceChildren(...savings.sections.map(renderSavingsSection));
    }

    return savings;
  }

  function itemTitle(item) {
    if (item.variantTitle && item.variantTitle !== 'Default Title') {
      return `${item.title} — ${item.variantTitle}`;
    }
    return item.title;
  }

  function renderBundleItem(item) {
    const line = document.createElement('li');
    line.className = 'bundle-summary__item';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'bundle-summary__image';
    if (item.image) {
      const image = document.createElement('img');
      image.src = item.image;
      image.alt = '';
      image.width = 80;
      image.height = 80;
      imageWrap.append(image);
    }

    const body = document.createElement('div');
    body.className = 'bundle-summary__item-body';

    const top = document.createElement('div');
    top.className = 'bundle-summary__item-top';

    const title = document.createElement('p');
    title.className = 'bundle-summary__item-title';
    title.textContent = itemTitle(item);

    const price = document.createElement('p');
    price.className = 'bundle-summary__item-price';
    price.textContent = formatMoney(item.price * item.quantity);

    top.append(title, price);

    const engrave = document.createElement('button');
    engrave.type = 'button';
    engrave.className = 'bundle-summary__engrave';
    engrave.dataset.engrave = String(item.variantId);
    engrave.textContent = item.engraving ? 'Edit engraving' : '+ Add engraving';

    const engraveInput = document.createElement('input');
    engraveInput.type = 'text';
    engraveInput.className = 'bundle-summary__engrave-input';
    engraveInput.dataset.engravingInput = String(item.variantId);
    engraveInput.value = item.engraving;
    engraveInput.placeholder = 'Engraving text';
    engraveInput.maxLength = 40;
    engraveInput.hidden = !engravingOpen.has(item.variantId) && !item.engraving;

    const actions = document.createElement('div');
    actions.className = 'bundle-summary__item-actions';

    const quantity = document.createElement('div');
    quantity.className = 'bundle-summary__quantity';

    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'bundle-summary__quantity-button';
    decrease.dataset.quantity = String(item.variantId);
    decrease.dataset.quantityChange = '-1';
    decrease.textContent = '−';
    decrease.disabled = item.quantity <= 1;
    decrease.setAttribute('aria-label', `Decrease ${item.title} quantity`);

    const quantityValue = document.createElement('span');
    quantityValue.className = 'bundle-summary__quantity-value';
    quantityValue.textContent = String(item.quantity);

    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'bundle-summary__quantity-button';
    increase.dataset.quantity = String(item.variantId);
    increase.dataset.quantityChange = '1';
    increase.textContent = '+';
    increase.disabled = typeof item.inventory === 'number' && item.quantity >= item.inventory;
    increase.setAttribute('aria-label', `Increase ${item.title} quantity`);

    quantity.append(decrease, quantityValue, increase);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'bundle-summary__remove';
    remove.dataset.remove = String(item.variantId);
    remove.textContent = 'Remove';

    actions.append(quantity, remove);
    body.append(top, engrave, engraveInput, actions);
    line.append(imageWrap, body);
    return line;
  }

  function syncProductButtons() {
    section.querySelectorAll('.bundle-products__card').forEach((card) => {
      const button = card.querySelector('[data-add-to-bundle]');
      const product = readProduct(card);
      if (!button || !product) return;

      const variant = selectedVariant(card, product);
      button.disabled = !variant || !variant.available;

      if (addedTimers.has(button)) return;

      button.classList.remove('is-added');
      button.textContent = config.addLabel || 'Add to Bundle';
    });
  }

  function renderBundle() {
    const total = calculateBundleTotal();
    const hasItems = bundleItems.length > 0;

    if (emptyEl) emptyEl.hidden = hasItems;
    if (filledEl) filledEl.hidden = !hasItems;

    if (itemsEl) {
      itemsEl.replaceChildren(...bundleItems.map(renderBundleItem));
    }

    const savings = updateSavingsProgress(total);
    const unlocked = savings.unlocked || 0;

    if (offerEl) {
      offerEl.hidden = unlocked <= 0;
      offerEl.textContent = unlocked > 0 ? `${formatMoney(unlocked)} off` : '';
    }

    if (actualEl) {
      actualEl.hidden = unlocked <= 0;
      actualEl.textContent = unlocked > 0 ? formatMoney(total) : '';
    }

    if (totalEl) {
      totalEl.textContent = formatMoney(Math.max(total - unlocked, 0));
    }
    const firstTierAmount = savings.tiers.length ? savings.tiers[0].amount : 0;
    const meetsFirstTier = total >= firstTierAmount;

    if (submitButton) {
      submitButton.hidden = !hasItems;
      submitButton.disabled = !hasItems || !meetsFirstTier || isSubmitting;
      submitButton.textContent = isSubmitting ? 'Adding...' : config.submitLabel || 'Add to Cart';
    }

    syncProductButtons();
  }

  function generateBundleId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return `bundle-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function addBundleToCart() {
    const minimum = [...tiers].sort((left, right) => left.amount - right.amount)[0];
    if (!bundleItems.length || isSubmitting || (minimum && calculateBundleTotal() < minimum.amount)) return;

    if (!window.SmitheyCart || typeof window.SmitheyCart.addItems !== 'function') {
      showError('The cart is still loading. Please try again.');
      return;
    }

    isSubmitting = true;
    showError('');
    renderBundle();

    const bundleId = generateBundleId();
    const bundleName = config.bundleName || 'Build Your Own Bundle';
    const bundleSavings = calculateBundleSavings(calculateBundleTotal()).unlocked || 0;
    const items = bundleItems.map((item) => {
      const properties = {
        _Bundle: bundleName,
        _Bundle_ID: bundleId,
        _Bundle_Savings: String(bundleSavings)
      };

      if (item.engraving.trim()) {
        properties.Engraving = item.engraving.trim();
      }

      return {
        id: item.variantId,
        quantity: item.quantity,
        properties
      };
    });

    try {
      await window.SmitheyCart.addItems(items);
      bundleItems.splice(0, bundleItems.length);
      engravingOpen.clear();
      isSubmitting = false;
      renderBundle();
    } catch (error) {
      isSubmitting = false;
      renderBundle();
      showError(error && error.message ? error.message : 'Unable to add this bundle to the cart.');
    }
  }

  section.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-to-bundle]');
    if (addButton && section.contains(addButton)) {
      const card = addButton.closest('.bundle-products__card');
      const product = card && readProduct(card);
      const variant = product && selectedVariant(card, product);
      if (product && variant) addProductToBundle(product, variant);
      return;
    }

    if (!summary.contains(event.target)) return;

    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) {
      removeProductFromBundle(Number(removeButton.dataset.remove));
      return;
    }

    const quantityButton = event.target.closest('[data-quantity]');
    if (quantityButton) {
      const variantId = Number(quantityButton.dataset.quantity);
      const item = findBundleItem(variantId);
      const delta = Number(quantityButton.dataset.quantityChange);
      if (item && delta) updateBundleQuantity(variantId, item.quantity + delta);
      return;
    }

    const engraveButton = event.target.closest('[data-engrave]');
    if (engraveButton) {
      const variantId = Number(engraveButton.dataset.engrave);
      if (engravingOpen.has(variantId)) {
        engravingOpen.delete(variantId);
      } else {
        engravingOpen.add(variantId);
      }
      renderBundle();
      const input = itemsEl && itemsEl.querySelector(`[data-engraving-input="${variantId}"]`);
      if (input && !input.hidden) input.focus();
    }
  });

  section.addEventListener('change', (event) => {
    if (event.target.matches('[data-variant-select]')) {
      const button = event.target.closest('.bundle-products__card')?.querySelector('[data-add-to-bundle]');
      const pending = button && addedTimers.get(button);
      if (pending) {
        clearTimeout(pending);
        addedTimers.delete(button);
      }
      syncProductButtons();
    }
  });

  if (itemsEl) {
    itemsEl.addEventListener('input', (event) => {
      const input = event.target.closest('[data-engraving-input]');
      if (!input) return;
      setEngraving(Number(input.dataset.engravingInput), input.value);
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', addBundleToCart);
  }

  renderBundle();
}

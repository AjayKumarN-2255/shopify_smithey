document.addEventListener('DOMContentLoaded', () => {
  const listing = document.querySelector('[data-recipe-listing]');
  if (!listing) return;

  const blogUrl = listing.dataset.blogUrl;
  const resultsEl = listing.querySelector('[data-recipe-listing-results]');
  const activeTagsEl = listing.querySelector('[data-recipe-listing-active]');
  const filterDropdowns = listing.querySelectorAll('[data-recipe-filter-dropdown]');

  let isLoading = false;

  function parseUrlState(url) {
    const parsed = new URL(url, window.location.origin);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const taggedIndex = pathParts.indexOf('tagged');
    let course = parsed.searchParams.get('course') || '';
    let shape = parsed.searchParams.get('shape') || '';
    let page = parseInt(parsed.searchParams.get('page') || '1', 10);

    if (!course && taggedIndex !== -1 && pathParts[taggedIndex + 1]) {
      course = decodeURIComponent(pathParts[taggedIndex + 1]).replace(/-/g, ' ');
    }

    if (page < 1 || Number.isNaN(page)) page = 1;

    return { course, shape, page };
  }

  function buildFetchUrl({ course, shape, page }) {
    let url = blogUrl;
    const params = new URLSearchParams();

    if (course) {
      params.set('course', course);
    }

    if (shape) {
      params.set('shape', shape);
    }

    if (page > 1) {
      params.set('page', String(page));
    }

    const query = params.toString();
    if (query) {
      url += `?${query}`;
    }

    return url;
  }

  function buildDisplayUrl({ course, shape, page }) {
    return buildFetchUrl({ course, shape, page });
  }

  function syncCheckboxes(state) {
    const courseDown = state.course.toLowerCase();

    listing.querySelectorAll('[data-recipe-course]').forEach((input) => {
      input.checked = input.value.toLowerCase() === courseDown;
    });

    listing.querySelectorAll('[data-recipe-shape]').forEach((input) => {
      input.checked = input.value === state.shape;
    });
  }

  function renderActiveTags(state) {
    if (!activeTagsEl) return;

    activeTagsEl.innerHTML = '';

    const hasFilter = Boolean(state.course || state.shape);
    if (!hasFilter) return;

    if (state.course) {
      let displayLabel = state.course;

      listing.querySelectorAll('[data-recipe-course]').forEach((input) => {
        if (input.value.toLowerCase() === state.course.toLowerCase()) {
          displayLabel = input.value;
        }
      });

      activeTagsEl.appendChild(createActiveTag(displayLabel, 'course'));
    }

    if (state.shape) {
      const label = listing.querySelector(`[data-recipe-shape][value="${state.shape}"]`);
      const displayLabel = label ? label.dataset.label : state.shape.replace(/-/g, ' ');
      activeTagsEl.appendChild(createActiveTag(displayLabel, 'shape'));
    }

    const clearAll = document.createElement('button');
    clearAll.type = 'button';
    clearAll.className = 'recipe-listing__active-tag recipe-listing__active-tag--clear';
    clearAll.dataset.clearAll = '';
    clearAll.innerHTML = '<span aria-hidden="true">&times;</span> CLEAR ALL';
    activeTagsEl.appendChild(clearAll);
  }

  function createActiveTag(label, type) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recipe-listing__active-tag';
    button.dataset.removeFilter = type;
    button.innerHTML = `<span aria-hidden="true">&times;</span> ${label.toUpperCase()}`;
    return button;
  }

  function closeAllDropdowns(except) {
    filterDropdowns.forEach((dropdown) => {
      if (dropdown !== except) {
        dropdown.classList.remove('is-open');
        dropdown.querySelector('[data-recipe-filter-toggle]')?.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function loadResults(nextState, pushHistory = true) {
    if (isLoading) return;

    isLoading = true;
    listing.classList.add('is-loading');

    const fetchUrl = buildFetchUrl(nextState);
    const displayUrl = buildDisplayUrl(nextState);

    try {
      const response = await fetch(fetchUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok) throw new Error('Failed to load recipes');

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newResults = doc.querySelector('[data-recipe-listing-results]');

      if (!newResults) throw new Error('Results container not found');

      resultsEl.innerHTML = newResults.innerHTML;
      syncCheckboxes(nextState);
      renderActiveTags(nextState);

      if (pushHistory) {
        window.history.pushState(nextState, '', displayUrl);
      }
    } catch (error) {
      window.location.href = displayUrl;
    } finally {
      isLoading = false;
      listing.classList.remove('is-loading');
    }
  }

  function getCurrentState() {
    return parseUrlState(window.location.href);
  }

  listing.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-recipe-filter-toggle]');
    if (toggle) {
      event.preventDefault();
      const dropdown = toggle.closest('[data-recipe-filter-dropdown]');
      const isOpen = dropdown.classList.contains('is-open');
      closeAllDropdowns();
      dropdown.classList.toggle('is-open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
      return;
    }

    const pageBtn = event.target.closest('[data-recipe-page]');
    if (pageBtn) {
      event.preventDefault();
      const state = getCurrentState();
      state.page = parseInt(pageBtn.dataset.recipePage, 10);
      loadResults(state);
      return;
    }

    const removeBtn = event.target.closest('[data-remove-filter]');
    if (removeBtn) {
      event.preventDefault();
      const state = getCurrentState();
      if (removeBtn.dataset.removeFilter === 'course') state.course = '';
      if (removeBtn.dataset.removeFilter === 'shape') state.shape = '';
      state.page = 1;
      loadResults(state);
      return;
    }

    if (event.target.closest('[data-clear-all]')) {
      event.preventDefault();
      loadResults({ course: '', shape: '', page: 1 });
    }
  });

  listing.addEventListener('change', (event) => {
    const courseInput = event.target.closest('[data-recipe-course]');
    const shapeInput = event.target.closest('[data-recipe-shape]');

    if (courseInput) {
      listing.querySelectorAll('[data-recipe-course]').forEach((input) => {
        if (input !== courseInput) input.checked = false;
      });
      listing.querySelectorAll('[data-recipe-shape]').forEach((input) => {
        input.checked = false;
      });

      const state = { course: '', shape: '', page: 1 };
      if (courseInput.checked) {
        state.course = courseInput.value;
      }
      loadResults(state);
      closeAllDropdowns();
      return;
    }

    if (shapeInput) {
      listing.querySelectorAll('[data-recipe-shape]').forEach((input) => {
        if (input !== shapeInput) input.checked = false;
      });
      listing.querySelectorAll('[data-recipe-course]').forEach((input) => {
        input.checked = false;
      });

      const state = { course: '', shape: '', page: 1 };
      if (shapeInput.checked) {
        state.shape = shapeInput.value;
      }
      loadResults(state);
      closeAllDropdowns();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-recipe-filter-dropdown]')) {
      closeAllDropdowns();
    }
  });

  window.addEventListener('popstate', (event) => {
    const state = event.state || parseUrlState(window.location.href);
    loadResults(state, false);
  });

  renderActiveTags(getCurrentState());
});

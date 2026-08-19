(function () {
  var root = document.querySelector('[data-privacy-policy]');
  if (!root) return;

  var navItems = root.querySelectorAll('[data-section]');
  var sections = root.querySelectorAll('[data-section-content]');
  var expandAll = root.querySelector('[data-expand-all]');
  var expandAllLabel = root.querySelector('[data-expand-all-label]');

  function privacyAccordions() {
    var section = root.querySelector('[data-section-content="privacy-policy"]');
    return section ? section.querySelectorAll('.privacy-policy__accordion') : [];
  }

  function allAccordionsOpen(accordions) {
    return (
      accordions.length > 0 &&
      Array.prototype.every.call(accordions, function (item) {
        return item.classList.contains('is-open');
      })
    );
  }

  function updateExpandAll() {
    if (!expandAll || !expandAllLabel) return;

    var accordions = privacyAccordions();
    var expanded = allAccordionsOpen(accordions);

    expandAll.classList.toggle('is-expanded', expanded);
    expandAll.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    expandAllLabel.textContent = expanded ? 'Collapse All' : 'Expand All';
  }

  navItems.forEach(function (button) {
    button.addEventListener('click', function () {
      var sectionId = button.getAttribute('data-section');

      navItems.forEach(function (item) {
        item.classList.remove('is-active');
      });

      sections.forEach(function (section) {
        section.classList.remove('is-active');
      });

      button.classList.add('is-active');

      var target = root.querySelector('[data-section-content="' + sectionId + '"]');
      if (target) target.classList.add('is-active');
    });
  });

  root.addEventListener('click', function (event) {
    var header = event.target.closest('.privacy-policy__accordion-header');
    if (!header || !root.contains(header)) return;

    var accordion = header.closest('.privacy-policy__accordion');
    if (!accordion) return;

    accordion.classList.toggle('is-open');
    header.setAttribute(
      'aria-expanded',
      accordion.classList.contains('is-open') ? 'true' : 'false'
    );
    updateExpandAll();
  });

  if (expandAll) {
    expandAll.addEventListener('click', function () {
      var accordions = privacyAccordions();
      var shouldOpen = !allAccordionsOpen(accordions);

      Array.prototype.forEach.call(accordions, function (item) {
        item.classList.toggle('is-open', shouldOpen);
        var header = item.querySelector('.privacy-policy__accordion-header');
        if (header) header.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      });

      updateExpandAll();
    });
  }
})();

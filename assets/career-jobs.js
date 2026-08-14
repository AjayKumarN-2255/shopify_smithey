document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-careers-jobs]');
  if (!root) return;

  const searchInput = root.querySelector('[data-careers-filter="search"]');
  const departmentSelect = root.querySelector('[data-careers-filter="department"]');
  const jobTypeSelect = root.querySelector('[data-careers-filter="job-type"]');
  const locationSelect = root.querySelector('[data-careers-filter="location"]');
  const countEl = root.querySelector('.careers-jobs__results-summary');
  const departments = root.querySelectorAll('.careers-jobs__department');
  const jobs = root.querySelectorAll('.career-job');

  if (!jobs.length) return;

  const normalize = (value) => (value || '').trim().toLowerCase();

  const getFilters = () => ({
    search: normalize(searchInput ? searchInput.value : ''),
    department: departmentSelect ? departmentSelect.value : '',
    jobType: jobTypeSelect ? jobTypeSelect.value : '',
    location: locationSelect ? locationSelect.value : '',
  });

  const matchesFilters = (job, filters) => {
    const title = normalize(job.dataset.title);
    const department = job.dataset.department || '';
    const location = job.dataset.location || '';
    const jobType = job.dataset.jobType || '';

    if (filters.search && !title.includes(filters.search)) return false;
    if (filters.department && department !== filters.department) return false;
    if (filters.jobType && jobType !== filters.jobType) return false;
    if (filters.location && location !== filters.location) return false;

    return true;
  };

  const updateCount = (visibleCount, filters) => {
    if (!countEl) return;

    const roleLabel = visibleCount === 1 ? 'role' : 'roles';
    const departmentLabel = filters.department || 'all departments';
    const locationLabel = filters.location || 'all locations';

    countEl.textContent = `${visibleCount} ${roleLabel} across ${departmentLabel} in ${locationLabel}`;
  };

  const applyFilters = () => {
    const filters = getFilters();
    let visibleCount = 0;

    departments.forEach((department) => {
      const departmentJobs = department.querySelectorAll('.career-job');
      let visibleInDepartment = 0;

      departmentJobs.forEach((job) => {
        const isMatch = matchesFilters(job, filters);
        job.hidden = !isMatch;
        if (isMatch) visibleInDepartment += 1;
      });

      department.hidden = visibleInDepartment === 0;
      visibleCount += visibleInDepartment;
    });

    updateCount(visibleCount, filters);
  };

  const bindFilter = (element, eventName) => {
    if (!element) return;
    element.addEventListener(eventName, applyFilters);
  };

  bindFilter(searchInput, 'input');
  bindFilter(departmentSelect, 'change');
  bindFilter(jobTypeSelect, 'change');
  bindFilter(locationSelect, 'change');

  applyFilters();
});

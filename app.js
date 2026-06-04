document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filterValue = button.dataset.filter;

      tabButtons.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      portfolioCards.forEach((card) => {
        const shouldShow = filterValue === 'all' || card.dataset.category === filterValue;
        card.classList.toggle('hidden', !shouldShow);
      });
    });
  });
});

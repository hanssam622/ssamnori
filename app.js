document.addEventListener('DOMContentLoaded', () => {
  const PROGRAM_DOWNLOAD_URLS = {
    naejari: '#',
    thinkchain: '#',
    tlog: '#',
    mininori: '#',
    batchnuki: '#',
    ieon: '#',
  };

  const tabButtons = document.querySelectorAll('.tab-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');
  const downloadLinks = document.querySelectorAll('[data-download-key]');
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleText = document.querySelector('.theme-toggle-text');
  const themeToggleIcon = document.querySelector('.theme-toggle-icon');

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('site-theme', theme);

    const isLight = theme === 'light';
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', isLight ? '다크 테마로 변경' : '라이트 테마로 변경');
    }
    if (themeToggleText) {
      themeToggleText.textContent = isLight ? 'Dark' : 'Light';
    }
    if (themeToggleIcon) {
      themeToggleIcon.textContent = isLight ? '●' : '○';
    }
  }

  const savedTheme = localStorage.getItem('site-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(savedTheme || (prefersLight ? 'light' : 'dark'));

  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
  });

  downloadLinks.forEach((link) => {
    const downloadUrl = PROGRAM_DOWNLOAD_URLS[link.dataset.downloadKey];
    link.href = downloadUrl || '#';
    if (downloadUrl && downloadUrl !== '#') {
      link.target = '_blank';
      link.rel = 'noopener';
    }
  });

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

  const heroLogo = document.querySelector('.hero-brand-logo');
  const heroChars = document.querySelectorAll('.hero-char');
  const heroSpeechBubble = document.getElementById('hero-speech-bubble');
  const speechTexts = ['ㅎㅇ', 'ㅎㅎ', '?'];
  let heroCharacterVisible = false;

  function pickHeroCharacter() {
    if (heroCharacterVisible) return;
    heroCharacterVisible = true;
    heroChars.forEach((char) => char.classList.remove('is-active'));

    const selectedChar = heroChars[Math.floor(Math.random() * heroChars.length)];
    const selectedSpeech = speechTexts[Math.floor(Math.random() * speechTexts.length)];

    selectedChar.classList.add('is-active');
    heroSpeechBubble.textContent = selectedSpeech;
  }

  function hideHeroCharacter() {
    heroCharacterVisible = false;
    heroChars.forEach((char) => char.classList.remove('is-active'));
  }

  if (heroLogo && heroChars.length > 0 && heroSpeechBubble) {
    heroLogo.addEventListener('pointerenter', pickHeroCharacter);
    heroLogo.addEventListener('mouseenter', pickHeroCharacter);
    heroLogo.addEventListener('focus', pickHeroCharacter);
    heroLogo.addEventListener('touchstart', pickHeroCharacter, { passive: true });
    heroLogo.addEventListener('pointerleave', hideHeroCharacter);
    heroLogo.addEventListener('mouseleave', hideHeroCharacter);
    heroLogo.addEventListener('blur', hideHeroCharacter);
  }
});

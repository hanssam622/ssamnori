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
  const heroCharacter = document.getElementById('hero-random-char');
  const heroSpeechImage = document.getElementById('hero-speech-image');
  const heroCharacterSources = [
    'assets/char_boy.png',
    'assets/char_rabbit.png',
    'assets/char_cat.png',
    ...Array.from({ length: 23 }, (_, index) => `assets/hero-characters/character-${index + 1}.png`),
  ];
  const heroSpeechSources = Array.from({ length: 9 }, (_, index) => `assets/speech-bubbles/bubble-${index + 1}.png`);
  let heroCharacterVisible = false;

  function pickHeroCharacter() {
    if (heroCharacterVisible) return;
    heroCharacterVisible = true;

    heroCharacter.src = heroCharacterSources[Math.floor(Math.random() * heroCharacterSources.length)];
    heroSpeechImage.src = heroSpeechSources[Math.floor(Math.random() * heroSpeechSources.length)];
    heroCharacter.classList.add('is-active');
    heroSpeechImage.classList.add('is-active');
  }

  function hideHeroCharacter() {
    heroCharacterVisible = false;
    heroCharacter.classList.remove('is-active');
    heroSpeechImage.classList.remove('is-active');
  }

  if (heroLogo && heroCharacter && heroSpeechImage) {
    heroLogo.addEventListener('pointerenter', pickHeroCharacter);
    heroLogo.addEventListener('mouseenter', pickHeroCharacter);
    heroLogo.addEventListener('focus', pickHeroCharacter);
    heroLogo.addEventListener('touchstart', pickHeroCharacter, { passive: true });
    heroLogo.addEventListener('pointerleave', hideHeroCharacter);
    heroLogo.addEventListener('mouseleave', hideHeroCharacter);
    heroLogo.addEventListener('blur', hideHeroCharacter);
  }
});

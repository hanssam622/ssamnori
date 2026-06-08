document.addEventListener('DOMContentLoaded', () => {
  const PROGRAM_DOWNLOAD_URLS = {
    naejari: 'https://drive.google.com/uc?export=download&id=1Lj7pRTqS6PxO97yb9-01HWGsvk7aOA61',
    naejariPortable: 'https://drive.google.com/uc?export=download&id=1iRPtdEbZFO6lFGbfBKO7qLx0H2JA75JA',
    thinkchain: 'https://drive.google.com/uc?export=download&id=1y62D_wWRUdfitge8bLOz6vujoUlgdrIC',
    thinkchainPortable: 'https://drive.google.com/uc?export=download&id=1fCBOVglnVkwzCNBoT6pegyI3fIFFQIyM',
    tlog: 'https://drive.google.com/uc?export=download&id=1-iCxK7ACpS5DsHs9dfFEeJP4w0QA3LyM',
    mininori: 'https://drive.google.com/uc?export=download&id=1o1Q3qACY8eHEi5LjXC3Pn8iCInt1aSsS',
    batchnuki: '#',
    ieon: '#',
  };

  const tabButtons = document.querySelectorAll('.tab-btn');
  const portfolioGrid = document.getElementById('grid-container');
  const portfolioCards = document.querySelectorAll('.portfolio-card');
  const downloadLinks = document.querySelectorAll('[data-download-key]');
  const copyEmailButton = document.querySelector('.footer-copy-email');
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleText = document.querySelector('.theme-toggle-text');
  const themeToggleIcon = document.querySelector('.theme-toggle-icon');
  const translationTabs = document.querySelectorAll('.translation-tab');
  const gradeTabs = document.querySelectorAll('.grade-tab');
  const translationSection = document.getElementById('translation-project');
  const translationTableBody = document.getElementById('translation-table-body');
  const translationSubjectLabels = {
    korean: '국어',
    social: '사회',
    science: '과학',
    moral: '도덕',
  };
  let activeSubject = 'korean';
  let activeGrade = '1';

  const translationProjects = [
    {
      subject: 'korean',
      grade: '1',
      semester: '1학기',
      unit: '자료 준비 중',
      lesson: '-',
      title: '국어 번역 자료',
      translationUrl: '',
      resourceUrl: '',
      note: '구글 드라이브 링크를 연결할 예정입니다.',
    },
    {
      subject: 'social',
      grade: '3',
      semester: '1학기',
      unit: '자료 준비 중',
      lesson: '-',
      title: '사회 번역 자료',
      translationUrl: '',
      resourceUrl: '',
      note: '구글 드라이브 링크를 연결할 예정입니다.',
    },
    {
      subject: 'science',
      grade: '3',
      semester: '1학기',
      unit: '자료 준비 중',
      lesson: '-',
      title: '과학 번역 자료',
      translationUrl: '',
      resourceUrl: '',
      note: '구글 드라이브 링크를 연결할 예정입니다.',
    },
    {
      subject: 'moral',
      grade: '3',
      semester: '1학기',
      unit: '자료 준비 중',
      lesson: '-',
      title: '도덕 번역 자료',
      translationUrl: '',
      resourceUrl: '',
      note: '구글 드라이브 링크를 연결할 예정입니다.',
    },
  ];

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
      const isTranslationProject = filterValue === 'translation-project';

      tabButtons.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      portfolioGrid?.classList.toggle('hidden', isTranslationProject);
      translationSection?.classList.toggle('hidden', !isTranslationProject);

      portfolioCards.forEach((card) => {
        const shouldShow = filterValue === 'all' || card.dataset.category === filterValue;
        card.classList.toggle('hidden', !shouldShow);
      });
    });
  });

  function renderLink(url, label) {
    if (!url) return '<span class="table-muted">준비 중</span>';
    return `<a href="${url}" target="_blank" rel="noopener" class="table-link">${label}</a>`;
  }

  function renderTranslationTable() {
    if (!translationTableBody) return;

    const rows = translationProjects.filter((item) => (
      item.subject === activeSubject && item.grade === activeGrade
    ));

    if (rows.length === 0) {
      translationTableBody.innerHTML = `
        <tr>
          <td>${activeGrade}학년</td>
          <td colspan="7" class="table-empty">${translationSubjectLabels[activeSubject]} 자료를 추가할 예정입니다.</td>
        </tr>
      `;
      return;
    }

    translationTableBody.innerHTML = rows.map((item) => `
      <tr>
        <td>${item.grade}학년</td>
        <td>${item.semester}</td>
        <td>${item.unit}</td>
        <td>${item.lesson}</td>
        <td>${item.title}</td>
        <td>${renderLink(item.translationUrl, '번역본')}</td>
        <td>${renderLink(item.resourceUrl, '자료')}</td>
        <td>${item.note}</td>
      </tr>
    `).join('');
  }

  translationTabs.forEach((button) => {
    button.addEventListener('click', () => {
      activeSubject = button.dataset.subject;
      translationTabs.forEach((tab) => tab.classList.toggle('active', tab === button));
      renderTranslationTable();
    });
  });

  gradeTabs.forEach((button) => {
    button.addEventListener('click', () => {
      activeGrade = button.dataset.grade;
      gradeTabs.forEach((tab) => tab.classList.toggle('active', tab === button));
      renderTranslationTable();
    });
  });

  renderTranslationTable();

  copyEmailButton?.addEventListener('click', async () => {
    const email = copyEmailButton.dataset.email;
    if (!email) return;

    try {
      await navigator.clipboard.writeText(email);
      copyEmailButton.textContent = '이메일 복사됨';
      window.setTimeout(() => {
        copyEmailButton.textContent = email;
      }, 1400);
    } catch {
      copyEmailButton.textContent = email;
    }
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
  const heroSpeechSources = [
    'assets/speech-bubbles/bubble-1.png',
    'assets/speech-bubbles/bubble-2.png',
    'assets/speech-bubbles/bubble-3.png',
    'assets/speech-bubbles/bubble-4.png',
    'assets/speech-bubbles/bubble-6.png',
    'assets/speech-bubbles/bubble-8.png',
    'assets/speech-bubbles/bubble-9.png',
  ];
  let heroCharacterVisible = false;
  let heroHoverToken = 0;

  function preloadImages(sources) {
    sources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  function pickHeroCharacter() {
    if (heroCharacterVisible) return;
    heroCharacterVisible = true;
    heroHoverToken += 1;
    const currentToken = heroHoverToken;

    heroCharacter.src = heroCharacterSources[Math.floor(Math.random() * heroCharacterSources.length)];
    heroSpeechImage.src = heroSpeechSources[Math.floor(Math.random() * heroSpeechSources.length)];

    requestAnimationFrame(() => {
      if (currentToken !== heroHoverToken) return;
      heroCharacter.classList.add('is-active');
      heroSpeechImage.classList.add('is-active');
    });
  }

  function hideHeroCharacter() {
    heroCharacterVisible = false;
    heroHoverToken += 1;
    heroCharacter.classList.remove('is-active');
    heroSpeechImage.classList.remove('is-active');
  }

  if (heroLogo && heroCharacter && heroSpeechImage) {
    preloadImages([...heroCharacterSources, ...heroSpeechSources]);

    const enterEvent = window.PointerEvent ? 'pointerenter' : 'mouseenter';
    const leaveEvent = window.PointerEvent ? 'pointerleave' : 'mouseleave';

    heroLogo.addEventListener(enterEvent, pickHeroCharacter);
    heroLogo.addEventListener('focus', pickHeroCharacter);
    heroLogo.addEventListener('touchstart', pickHeroCharacter, { passive: true });
    heroLogo.addEventListener(leaveEvent, hideHeroCharacter);
    heroLogo.addEventListener('blur', hideHeroCharacter);
  }
});

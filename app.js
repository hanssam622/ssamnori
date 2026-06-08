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
  const copyEmailButton = document.querySelector('.footer-copy-email');
  const themeToggle = document.getElementById('theme-toggle');
  const themeToggleText = document.querySelector('.theme-toggle-text');
  const themeToggleIcon = document.querySelector('.theme-toggle-icon');
  const translationTabs = document.querySelectorAll('.translation-tab');
  const gradeTabs = document.querySelectorAll('.grade-tab');
  const translationSection = document.getElementById('translation-project');
  const translationTableBody = document.getElementById('translation-table-body');
  let activeProjectFilter = 'all';
  let currentProjects = [];
  const translationSubjectLabels = {
    korean: '국어',
    social: '사회',
    science: '과학',
    moral: '도덕',
  };
  let activeSubject = 'korean';
  let activeGrade = '1';
  const themes = ['dark', 'light', 'sunset'];
  const themeUi = {
    dark: {
      label: 'Light',
      icon: '○',
      aria: '라이트 테마로 변경',
    },
    light: {
      label: 'Sunset',
      icon: '◐',
      aria: '선셋 테마로 변경',
    },
    sunset: {
      label: 'Dark',
      icon: '●',
      aria: '다크 테마로 변경',
    },
  };

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
    const nextTheme = themes.includes(theme) ? theme : 'dark';
    const ui = themeUi[nextTheme];

    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('site-theme', nextTheme);

    if (themeToggle) {
      themeToggle.setAttribute('aria-label', ui.aria);
    }
    if (themeToggleText) {
      themeToggleText.textContent = ui.label;
    }
    if (themeToggleIcon) {
      themeToggleIcon.textContent = ui.icon;
    }
  }

  const savedTheme = localStorage.getItem('site-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(savedTheme || (prefersLight ? 'light' : 'dark'));

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme;
    const currentIndex = themes.indexOf(currentTheme);
    applyTheme(themes[(currentIndex + 1) % themes.length]);
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderIcon(type) {
    const icons = {
      play: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>',
      download: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>',
      external: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>',
      info: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M12 8.25h.008v.008H12V8.25Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>',
    };
    return icons[type] || '';
  }

  function getBadgeClass(project) {
    if (project.badge === '웹게임' || project.category === 'web-game') return 'badge-web-game';
    return 'badge-file';
  }

  function renderThumbnail(project) {
    if (project.thumbnail) {
      return `<img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)} 썸네일" class="card-thumb">`;
    }

    return `
      <div class="card-thumb-fallback">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5h10.5m-10.5 4.5h10.5m-10.5 4.5h6.75" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 4.5h15v15h-15v-15Z" />
        </svg>
      </div>
    `;
  }

  function getActionUrl(action) {
    if (action.downloadKey) return PROGRAM_DOWNLOAD_URLS[action.downloadKey] || '#';
    return action.url || '#';
  }

  function renderAction(action, project) {
    const type = action.type || 'info';
    const url = getActionUrl(action);
    const label = action.label || '열기';
    const classes = ['btn'];
    let title = '';
    let target = '';
    let text = escapeHtml(label);

    if (type === 'play') classes.push('btn-web-game');
    if (type === 'download') classes.push('btn-download-game');
    if (type === 'portable') classes.push('btn-secondary', 'btn-portable');
    if (type === 'info') classes.push('btn-secondary', 'btn-info');
    if (type === 'external') {
      classes.push('btn-secondary');
      title = ' title="새 창에서 열기"';
      target = ' target="_blank" rel="noopener"';
      text = '';
    }
    if (action.downloadKey && url !== '#') {
      target = ' target="_blank" rel="noopener"';
    }

    const icon = renderIcon(type);
    const aria = `${project.title} ${label}`;
    return `<a href="${escapeHtml(url)}" class="${classes.join(' ')}"${target}${title} aria-label="${escapeHtml(aria)}">${icon}${text}</a>`;
  }

  function renderProjectCard(project) {
    return `
      <article class="portfolio-card" data-category="${escapeHtml(project.category)}" id="card-${escapeHtml(project.id)}">
        <div class="card-thumb-container" data-project-edit="thumbnail" data-project-id="${escapeHtml(project.id)}">
          ${renderThumbnail(project)}
          <span class="card-badge ${getBadgeClass(project)}">${escapeHtml(project.badge)}</span>
        </div>
        <div class="card-content">
          <h2 class="card-title" data-project-edit="title" data-project-id="${escapeHtml(project.id)}">${escapeHtml(project.title)}</h2>
          <p class="card-desc" data-project-edit="description" data-project-id="${escapeHtml(project.id)}">${escapeHtml(project.description)}</p>
          <div class="card-actions">
            ${(project.actions || []).map((action, index) => renderAction(action, project).replace('<a ', `<a data-project-edit="action" data-project-id="${escapeHtml(project.id)}" data-action-index="${index}" `)).join('')}
          </div>
        </div>
      </article>
    `;
  }

  function renderProjects(projects) {
    currentProjects = Array.isArray(projects) ? projects : [];
    window.ssamnoriProjects = currentProjects;
    portfolioGrid.innerHTML = currentProjects.map(renderProjectCard).join('');
    applyProjectFilter();
    window.dispatchEvent(new CustomEvent('ssamnori:projects-rendered', {
      detail: { projects: currentProjects },
    }));
  }

  function applyProjectFilter() {
    const portfolioCards = document.querySelectorAll('.portfolio-card');
    portfolioCards.forEach((card) => {
      const shouldShow = activeProjectFilter === 'all' || card.dataset.category === activeProjectFilter;
      card.classList.toggle('hidden', !shouldShow);
    });
  }

  async function loadProjects() {
    if (!portfolioGrid) return;

    try {
      const response = await fetch('data/projects.json');
      if (!response.ok) throw new Error(`Project data request failed: ${response.status}`);
      const projects = await response.json();
      renderProjects(projects);
    } catch (error) {
      portfolioGrid.innerHTML = '<p class="portfolio-empty">프로젝트 목록을 불러오지 못했습니다.</p>';
      console.error(error);
    }
  }

  window.ssamnoriSite = {
    getProjects: () => currentProjects,
    renderProjects,
  };

  loadProjects();

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filterValue = button.dataset.filter;
      const isTranslationProject = filterValue === 'translation-project';
      activeProjectFilter = filterValue;

      tabButtons.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      portfolioGrid?.classList.toggle('hidden', isTranslationProject);
      translationSection?.classList.toggle('hidden', !isTranslationProject);

      applyProjectFilter();
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

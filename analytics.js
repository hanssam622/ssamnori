(function () {
  'use strict';

  const MEASUREMENT_ID = 'G-TNZDXB16LN';
  const STATS_ENDPOINT = window.SSAMNORI_STATS_ENDPOINT || '';
  const NUMBER_FORMAT = new Intl.NumberFormat('ko-KR');
  const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const DOWNLOAD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"/></svg>';
  const DOWNLOAD_PROJECT_IDS = {
    naejari: 'seat',
    naejariPortable: 'seat',
    thinkchain: 'mindmap',
    thinkchainPortable: 'mindmap',
  };
  const IS_LOCAL = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
    || window.location.protocol === 'file:';

  if (!IS_LOCAL) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  function normalizeId(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
  }

  function projectIdForLink(link) {
    const card = link.closest('.portfolio-card');
    if (card?.id) return card.id.replace(/^(?:static-)?card-/, '');

    if (link.dataset.downloadKey) {
      return DOWNLOAD_PROJECT_IDS[link.dataset.downloadKey] || link.dataset.downloadKey;
    }

    const match = window.location.pathname.match(/\/programs\/([^/]+)\.html$/);
    return match ? match[1] : '';
  }

  function isDownloadLink(link) {
    return link.matches('.btn-download-game, .btn-portable, [data-download-key]')
      || /drive\.google\.com\/(?:file\/d\/|uc\?)/.test(link.href);
  }

  document.addEventListener('click', (event) => {
    if (IS_LOCAL) return;
    const link = event.target.closest('a[href]');
    if (!link || !isDownloadLink(link)) return;

    const projectId = normalizeId(projectIdForLink(link));
    if (!projectId) return;

    window.gtag('event', `download_${projectId}`, {
      link_url: link.href,
      transport_type: 'beacon',
    });
  });

  function formatNumber(value) {
    const number = Number(value);
    return NUMBER_FORMAT.format(Number.isFinite(number) ? number : 0);
  }

  function renderCardStats(stats) {
    document.querySelectorAll('[data-stats-project]').forEach((container) => {
      const gameId = container.dataset.statsGame;
      const downloadId = normalizeId(container.dataset.statsDownload);
      const items = [];

      if (gameId) {
        items.push(`${EYE_ICON}<span>이용 ${formatNumber(stats.games?.[gameId] || 0)}</span>`);
      }
      if (downloadId) {
        items.push(`${DOWNLOAD_ICON}<span>다운로드 ${formatNumber(stats.downloads?.[downloadId] || 0)}</span>`);
      }

      container.innerHTML = items.map((item) => `<span class="card-stat">${item}</span>`).join('');
      container.hidden = items.length === 0;
    });
  }

  function renderSiteStats(stats) {
    const container = document.getElementById('site-stats');
    if (!container || !stats.site) return;

    const values = {
      todayVisitors: stats.site.todayVisitors,
      totalVisitors: stats.site.totalVisitors,
      totalGameViews: stats.site.totalGameViews,
      totalDownloads: stats.site.totalDownloads,
    };

    Object.entries(values).forEach(([key, value]) => {
      const target = container.querySelector(`[data-site-stat="${key}"]`);
      if (target) target.textContent = formatNumber(value);
    });
    container.hidden = false;
  }

  let publicStats = null;
  function renderPublicStats() {
    if (!publicStats) return;
    renderCardStats(publicStats);
    renderSiteStats(publicStats);
  }

  async function loadPublicStats() {
    if (!STATS_ENDPOINT) return;

    try {
      const response = await fetch(STATS_ENDPOINT, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Stats request failed: ${response.status}`);
      publicStats = await response.json();
      renderPublicStats();
    } catch (error) {
      console.warn('Public statistics are temporarily unavailable.', error);
    }
  }

  window.addEventListener('ssamnori:projects-rendered', renderPublicStats);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPublicStats, { once: true });
  } else {
    loadPublicStats();
  }
})();

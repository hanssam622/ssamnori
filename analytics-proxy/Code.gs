const PROPERTY_ID = '553853267';
const TRACKING_START_DATE = '2026-09-14';
const CACHE_KEY = 'ssamnori-public-stats-v1';
const CACHE_SECONDS = 3600;

function doGet() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CACHE_KEY);
  if (cached) return jsonOutput_(cached);

  const totals = report_({
    dateRanges: [{ startDate: TRACKING_START_DATE, endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
  });
  const today = report_({
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }],
  });
  const gameRows = report_({
    dateRanges: [{ startDate: TRACKING_START_DATE, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'CONTAINS', value: '/games/' },
      },
    },
    limit: 1000,
  });
  const downloadRows = report_({
    dateRanges: [{ startDate: TRACKING_START_DATE, endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'BEGINS_WITH', value: 'download_' },
      },
    },
    limit: 1000,
  });

  const games = {};
  (gameRows.rows || []).forEach((row) => {
    const path = row.dimensionValues[0].value;
    const match = path.match(/\/games\/([^/]+)\/(?:index\.html)?$/);
    if (!match) return;
    games[match[1]] = (games[match[1]] || 0) + number_(row.metricValues[0].value);
  });

  const downloads = {};
  (downloadRows.rows || []).forEach((row) => {
    const name = row.dimensionValues[0].value.replace(/^download_/, '');
    downloads[name] = number_(row.metricValues[0].value);
  });

  const totalDownloads = Object.keys(downloads)
    .reduce((sum, key) => sum + downloads[key], 0);
  const totalGameViews = Object.keys(games)
    .reduce((sum, key) => sum + games[key], 0);
  const payload = JSON.stringify({
    updatedAt: new Date().toISOString(),
    site: {
      todayVisitors: metric_(today, 0),
      totalVisitors: metric_(totals, 0),
      pageViews: metric_(totals, 1),
      totalGameViews: totalGameViews,
      totalDownloads: totalDownloads,
    },
    games: games,
    downloads: downloads,
  });

  cache.put(CACHE_KEY, payload, CACHE_SECONDS);
  return jsonOutput_(payload);
}

function report_(request) {
  return AnalyticsData.Properties.runReport(request, 'properties/' + PROPERTY_ID);
}

function metric_(report, index) {
  const row = (report.rows || [])[0];
  return row ? number_(row.metricValues[index].value) : 0;
}

function number_(value) {
  const number = Number(value);
  return isFinite(number) ? number : 0;
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(value)
    .setMimeType(ContentService.MimeType.JSON);
}

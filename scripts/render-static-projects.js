const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const projectsPath = path.join(root, 'data', 'projects.json');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'))
  .sort((a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0));

const cards = projects.map((project) => {
  const thumbnail = project.thumbnail
    ? `<img src="${escapeHtml(project.thumbnail)}" alt="${escapeHtml(project.title)} 썸네일" class="card-thumb">`
    : `<div class="card-thumb-fallback" aria-label="${escapeHtml(project.title)} 썸네일 준비 중">${escapeHtml(project.title)}</div>`;
  const actions = (project.actions || []).map((action) => {
    if (!action.url) return '';
    const external = action.type === 'external' || /^https?:\/\//.test(action.url);
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escapeHtml(action.url)}" class="btn btn-secondary"${attrs}>${escapeHtml(action.label || '열기')}</a>`;
  }).join('');

  return `      <article class="portfolio-card" data-category="${escapeHtml(project.category)}" id="static-card-${escapeHtml(project.id)}">
        <div class="card-thumb-container">
          ${thumbnail}
          <span class="card-badge">${escapeHtml(project.badge)}</span>
        </div>
        <div class="card-content">
          <h2 class="card-title">${escapeHtml(project.title)}</h2>
          <p class="card-desc">${escapeHtml(project.description)}</p>
          <div class="card-actions">${actions}</div>
        </div>
      </article>`;
}).join('\n');

const start = '      <!-- STATIC_PROJECTS_START -->';
const end = '      <!-- STATIC_PROJECTS_END -->';
const index = fs.readFileSync(indexPath, 'utf8');
const updated = index.replace(
  new RegExp(`${start}[\\s\\S]*?${end}`),
  `${start}\n${cards}\n${end}`,
);

if (updated === index && !index.includes(`${start}\n${cards}\n${end}`)) {
  throw new Error('Static project markers were not found in index.html');
}

fs.writeFileSync(indexPath, updated);

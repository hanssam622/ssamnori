const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const project = JSON.parse(read('data/projects.json')).find((item) => item.id === 'ieon');
const download = project.actions.find((action) => action.type === 'download');
const page = read('programs/ieon.html');
const app = read('app.js');
const index = read('index.html');
const sources = {
  quick: '이어온-빠른-시작.html',
  manual: '이어온-사용설명서.html',
  classroom: '이어온-수업자료-안내.html',
  updates: '이어온-업데이트-내역.html',
};

assert.match(download.url, /^https:\/\/drive\.google\.com\/file\/d\/[^/]+\/view/);
assert.ok(download.label.includes(project.version));
assert.ok(page.includes(`현재 배포 버전 ${project.version}`));
assert.ok(page.includes(download.url.replaceAll('&', '&amp;')));
assert.ok(app.includes(`ieon: '${download.url}'`));
assert.ok(index.includes(download.url.replaceAll('&', '&amp;')));
assert.equal((page.match(/role="tab" /g) || []).length, 4);
assert.equal((page.match(/role="tabpanel" /g) || []).length, 4);

for (const [id, filename] of Object.entries(sources)) {
  let original = read(`programs/ieon-guides/${filename}`);
  if (id === 'quick') {
    original = original.replace('https://claude.ai/artifact/RGmRjoBYH3jqXnGE2sT7kc', '#guide=manual')
      .replace('https://claude.ai/artifact/7jkcum8Q5UWqsd8GRfzvi5', '#guide=classroom');
  }
  const encoded = page.match(new RegExp(`\\b${id}: \\x60([A-Za-z0-9+/=\\s]+)\\x60`));
  assert.ok(encoded, `${id} document missing`);
  assert.equal(Buffer.from(encoded[1].replace(/\s/g, ''), 'base64').toString('utf8'), original);
  assert.ok(page.includes(`id="tab-${id}" aria-controls="panel-${id}"`));
  assert.ok(page.includes(`id="panel-${id}" role="tabpanel" aria-labelledby="tab-${id}"`));
}
assert.ok(read('programs/ieon-guides/이어온-업데이트-내역.html').includes(`최신 배포 ${project.version}`));
assert.ok(!page.includes('17W3fU3Qi5Xg4CSls25aVS_kIwavPYuB_'), 'generator restored an obsolete download');
console.log('이어온: 4개 탭, 설명서 원문 보존, 버전, 다운로드 주소 일치 확인');

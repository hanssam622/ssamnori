const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const baseUrl = 'https://hanssam622.github.io/ssamnori';

const games = [
  {
    slug: 'fractionman', title: '분수맨', image: 'fractionman.jpg', game: 'fractionman',
    description: '분모와 분자, 분수의 종류부터 분수와 대분수의 덧셈·뺄셈까지 익히는 전자칠판용 수학 게임입니다.',
    learning: '분수를 가르고 모으는 활동을 통해 분수의 구조를 시각적으로 이해하고, 자연스럽게 분수 계산으로 이어갈 수 있습니다.',
    steps: ['학습할 분수 활동이나 계산 단계를 선택합니다.', '전자칠판에서 문제를 함께 읽고 답을 조작합니다.', '결과를 확인하며 풀이 과정과 분수 개념을 설명합니다.'],
  },
  {
    slug: 'gugudan-fighter', title: '구구단파이터', image: 'gugudan.png', game: 'gugudan',
    description: '구구단 문제를 빠르게 풀며 몬스터와 대결하는 전자칠판용 곱셈 연습 게임입니다.',
    learning: '반복 문제 풀이를 전투 흐름과 결합해 곱셈구구의 정확성과 계산 속도를 함께 기를 수 있습니다.',
    steps: ['연습할 구구단 범위와 게임 방식을 선택합니다.', '제시된 곱셈 문제의 답을 입력합니다.', '몬스터와의 대결 결과를 확인하며 학급 전체가 함께 참여합니다.'],
  },
  {
    slug: 'calcman', title: '연산맨', image: 'calcman.png', game: 'calcman',
    description: '곱셈의 받아올림과 나눗셈의 계산 과정을 단계별로 연습하는 전자칠판용 수학 게임입니다.',
    learning: '정답만 맞히는 데서 그치지 않고 자릿값, 받아올림, 몫과 나머지가 놓이는 위치를 확인하며 계산 원리를 익힙니다.',
    steps: ['연습할 곱셈 또는 나눗셈 유형을 선택합니다.', '계산 순서에 맞춰 각 자리에 수를 입력합니다.', '풀이를 확인하고 틀린 단계의 계산 원리를 다시 설명합니다.'],
  },
  {
    slug: 'shapeman', title: '도형맨', image: 'shapeman.png', game: 'shapeman',
    description: '삼각형을 변의 길이와 각의 크기에 따라 분류하고 직접 만들어 보는 전자칠판용 도형 게임입니다.',
    learning: '이등변삼각형, 정삼각형과 여러 각의 특징을 비교하며 삼각형의 분류 기준을 구체적으로 이해할 수 있습니다.',
    steps: ['분류 또는 삼각형 만들기 활동을 선택합니다.', '변의 길이와 각의 크기를 관찰해 알맞은 종류를 고릅니다.', '직접 만든 삼각형이 조건을 만족하는지 함께 확인합니다.'],
  },
  {
    slug: 'angleman', title: '각도맨', image: 'angleman.png', game: 'angleman',
    description: '각도기로 각을 맞추고 실제 각도를 재어 보며 각도의 개념을 익히는 전자칠판용 수학 게임입니다.',
    learning: '각도기의 중심과 기준선을 올바르게 맞추고 눈금을 읽는 과정을 반복해 각도 측정 능력을 기릅니다.',
    steps: ['각도 맞추기 또는 실전 각도 재기 활동을 선택합니다.', '각도기의 중심점과 한 변을 기준선에 맞춥니다.', '알맞은 눈금을 읽고 답을 확인합니다.'],
  },
  {
    slug: 'graphman', title: '그래프맨', image: 'graphman.svg', game: 'graphman',
    description: '표를 읽고 막대그래프의 높이를 직접 맞추며 자료 해석과 그래프 그리기를 연습하는 수학 게임입니다.',
    learning: '표와 막대그래프의 대응 관계를 살피고 눈금 한 칸의 크기를 고려해 자료를 정확하게 표현할 수 있습니다.',
    steps: ['제시된 표의 항목과 수량을 확인합니다.', '눈금의 단위를 읽고 막대 높이를 알맞게 조절합니다.', '완성한 그래프를 확인하고 자료에서 알 수 있는 내용을 말합니다.'],
  },
];

const render = (game) => `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${game.title} | 전자칠판 수학 게임 | 쌤노리</title>
  <meta name="description" content="${game.description}">
  <link rel="canonical" href="${baseUrl}/programs/${game.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="쌤노리">
  <meta property="og:title" content="${game.title} | 쌤노리">
  <meta property="og:description" content="${game.description}">
  <meta property="og:url" content="${baseUrl}/programs/${game.slug}.html">
  <meta property="og:image" content="${baseUrl}/assets/thumbnails/${game.image}">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebApplication","name":"${game.title}","applicationCategory":"EducationalApplication","operatingSystem":"Web Browser","url":"${baseUrl}/games/${game.game}/index.html","description":"${game.description}"}
  </script>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header class="header">
    <div class="container header-container">
      <a href="../index.html" class="logo-link">
        <img src="../assets/ssamnori-logo.png" alt="쌤노리" class="site-logo">
        <span class="logo-badge">Portfolio</span>
      </a>
      <button class="theme-toggle" id="theme-toggle" type="button" aria-label="라이트 테마로 변경">
        <span class="theme-toggle-icon" aria-hidden="true">○</span>
        <span class="theme-toggle-text">Light</span>
      </button>
    </div>
  </header>
  <main class="program-main">
    <div class="program-shell">
      <a href="../index.html" class="program-back">← 게임 목록으로</a>
      <section class="program-hero">
        <div>
          <span class="program-kicker">Educational Web Game</span>
          <h1 class="program-title">${game.title}</h1>
          <p class="program-desc">${game.description}</p>
          <div class="program-actions">
            <a href="../games/${game.game}/index.html" class="btn btn-web-game">바로 플레이</a>
          </div>
        </div>
        <div class="program-preview">
          <img src="../assets/thumbnails/${game.image}" alt="${game.title} 게임 화면">
        </div>
      </section>
      <section class="program-section">
        <h2>학습 내용</h2>
        <p>${game.learning}</p>
      </section>
      <section class="program-section">
        <h2>활용 방법</h2>
        <ul>${game.steps.map((step) => `\n          <li>${step}</li>`).join('')}\n        </ul>
      </section>
    </div>
  </main>
  <script src="../app.js"></script>
</body>
</html>
`;

for (const game of games) {
  fs.writeFileSync(path.join(root, 'programs', `${game.slug}.html`), render(game));
}

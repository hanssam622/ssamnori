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

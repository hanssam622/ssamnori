/**
 * achuhanssam Portfolio Website Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  
  /* ==========================================
     1. Portfolio Category Filtering
     ========================================== */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });

      // Add active class to clicked button
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      const filterValue = button.getAttribute('data-filter');

      // Filter cards
      portfolioCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (filterValue === 'all' || cardCategory === filterValue) {
          card.classList.remove('hidden');
          // Add quick scale transition
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });


  /* ==========================================
     2. In-Site Iframe Play Modal (<dialog>)
     ========================================== */
  const playDialog = document.getElementById('play-dialog');
  const playDialogTitle = document.getElementById('play-dialog-title');
  const playIframe = document.getElementById('play-iframe');
  const btnDialogExternal = document.getElementById('btn-dialog-external');
  const btnDialogClose = document.getElementById('btn-dialog-close');
  const playTriggers = document.querySelectorAll('.btn-play-trigger');

  function openPlayModal(title, src) {
    playDialogTitle.textContent = title;
    playIframe.src = src;
    btnDialogExternal.href = src;
    playDialog.showModal();
  }

  function closePlayModal() {
    // Crucial: Set iframe source to blank to stop sound/JS threads of the game
    playIframe.src = 'about:blank';
    playDialog.close();
  }

  playTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const title = trigger.getAttribute('data-title');
      const src = trigger.getAttribute('data-src');
      openPlayModal(title, src);
    });
  });

  btnDialogClose.addEventListener('click', closePlayModal);

  // Close when clicking on backdrop
  playDialog.addEventListener('click', (event) => {
    const rect = playDialog.getBoundingClientRect();
    const isInDialog = (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
    if (!isInDialog) {
      closePlayModal();
    }
  });


  /* ==========================================
     3. Classroom Drawer Navigation
     ========================================== */
  const btnOpenDrawer = document.getElementById('btn-open-drawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawer = document.getElementById('drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

  function openDrawer() {
    drawer.classList.add('open');
    drawerBackdrop.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent main page scrolling
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawerBackdrop.classList.remove('show');
    document.body.style.overflow = '';
  }

  btnOpenDrawer.addEventListener('click', openDrawer);
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);


  /* ==========================================
     4. Widget 1: Digital Classroom Timer
     ========================================== */
  let timerInterval = null;
  let timerSeconds = 180; // Default 3 minutes
  let timerIsRunning = false;

  const timerVal = document.getElementById('timer-val');
  const btnTimerToggle = document.getElementById('btn-timer-toggle');
  const btnTimerReset = document.getElementById('btn-timer-reset');
  const presetButtons = document.querySelectorAll('.preset-btn');

  function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerVal.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function startTimer() {
    if (timerIsRunning) return;
    
    timerIsRunning = true;
    btnTimerToggle.textContent = '일시정지';
    btnTimerToggle.style.background = '#e11d48'; // Rosy red for pause
    
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        timerIsRunning = false;
        btnTimerToggle.textContent = '시작';
        btnTimerToggle.style.background = 'var(--color-tool)';
        
        // Simple alarm sound using browser Web Audio API (No files needed!)
        playAlarmSound();
        alert('⏰ 설정한 수업 시간이 모두 끝났습니다!');
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(timerInterval);
    timerIsRunning = false;
    btnTimerToggle.textContent = '시작';
    btnTimerToggle.style.background = 'var(--color-tool)';
  }

  function resetTimer() {
    pauseTimer();
    updateTimerDisplay();
  }

  function playAlarmSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      
      oscillator.start();
      
      // Stop oscillator after 1 second
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 1000);
    } catch (e) {
      console.log('Audio Context error: ', e);
    }
  }

  btnTimerToggle.addEventListener('click', () => {
    if (timerIsRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  btnTimerReset.addEventListener('click', () => {
    // Reset to current preset base or default (180s)
    resetTimer();
  });

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const time = parseInt(btn.getAttribute('data-time'), 10);
      timerSeconds = time;
      resetTimer();
    });
  });

  // Initial update
  updateTimerDisplay();


  /* ==========================================
     5. Widget 2: Student Random Name Picker
     ========================================== */
  const pickerList = document.getElementById('picker-list');
  const pickerResult = document.getElementById('picker-result');
  const btnPickStart = document.getElementById('btn-pick-start');
  let isPicking = false;

  btnPickStart.addEventListener('click', () => {
    if (isPicking) return;

    // Parse list of names
    const names = pickerList.value
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      pickerResult.textContent = '명단을 작성해주세요!';
      pickerResult.style.color = '#ef4444';
      return;
    }

    isPicking = true;
    pickerResult.style.color = 'var(--text-primary)';
    
    let counter = 0;
    const maxTicks = 15; // Animation duration ticks
    const tickInterval = 80; // ms per tick

    // Shuffling suspense animation
    const pickerTimer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * names.length);
      pickerResult.textContent = names[randomIndex];
      
      // Add subtle scale variation to result text during shuffle
      pickerResult.style.transform = `scale(${0.95 + Math.random() * 0.1})`;
      
      counter++;
      
      if (counter >= maxTicks) {
        clearInterval(pickerTimer);
        
        // Pick final winner
        const finalIndex = Math.floor(Math.random() * names.length);
        const winner = names[finalIndex];
        
        // Style winner results
        pickerResult.textContent = `🎉 ${winner} 🎉`;
        pickerResult.style.color = '#ffd700'; // Gold color
        pickerResult.style.transform = 'scale(1.15)';
        
        isPicking = false;
      }
    }, tickInterval);
  });

});

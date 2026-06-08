(() => {
  const GAME_META = {
    1: { emoji: '📐', title: '각도 만들기', description: '반원 각도기를 눌러 목표 각도를 만들어요.' },
    2: { emoji: '🔺', title: '삼각형의 각', description: '삼각형의 한 각을 보고 남은 각을 구해요.' },
    3: { emoji: '🔷', title: '사각형의 각', description: '사각형의 숨겨진 각을 찾아요.' },
    4: { emoji: '📏', title: '실전 각도재기', description: '실제 각도기가 자동으로 맞춰지고, 눈금을 읽어 입력해요.' },
    5: { emoji: '🧭', title: '실전 각도재기 튜토리얼', description: '0°에서 어디부터 읽는지 화살표 애니메이션으로 따라가며 익혀요.' }
  };
  const DEG = Math.PI / 180;
  const PROTRACTOR_SOURCE = typeof window !== 'undefined' && typeof window.PROTRACTOR_DATA_URI === 'string'
    ? window.PROTRACTOR_DATA_URI
    : 'assets/protractor-preview-transparent.png';
  const PROTRACTOR_ORIGIN_X = 1104.5;
  const PROTRACTOR_ORIGIN_Y = 999;
  const PROTRACTOR_RADIUS = 915.5;
  const PROTRACTOR_PLACE_TOLERANCE = 22;
  const PROTRACTOR_ALIGN_TOLERANCE = 5 * DEG;
  const PROTRACTOR_READ_TOLERANCE = 2.5;
  const STORAGE_KEY = 'angleman-student-state-v1';
  const EXPORT_FILE_NAME = 'angleman-students.json';
  const DEFAULT_PLAYER_COUNT = 5;
  const DEFAULT_CUSTOM_TIMER_SECONDS = 90;
  const MEASURE_NUMBER_STORAGE_KEY = 'angleman-measure-number-visible-v1';
  const MEASURE_TUTORIAL_STEPS = [
    { phaseText: '1. 시작하는 변 옆 0°를 먼저 봐요', startProgress: 1, arcProgress: 0, endProgress: 0 },
    { phaseText: '2. 0°에서 원호 화살표를 따라가요', startProgress: 1, arcProgress: 1, endProgress: 0 },
    { phaseText: '3. 끝나는 변을 만난 숫자를 읽어요', startProgress: 1, arcProgress: 1, endProgress: 1 },
    { phaseText: '0°가 붙은 쪽에서부터 읽으면 헷갈리지 않아요', startProgress: 1, arcProgress: 1, endProgress: 1 }
  ];
  const TIMER_OPTIONS = {
    '30': { label: '30초', seconds: 30 },
    '60': { label: '1분', seconds: 60 },
    '120': { label: '2분', seconds: 120 },
    custom: { label: '사용자 지정', seconds: null },
    none: { label: '무제한', seconds: null }
  };
  const ASSIGNMENT_OPTIONS = {
    none: '학생 이름 사용 안 함',
    sequential: '번호순',
    random: '랜덤'
  };

  const protractorImage = new Image();
  let protractorReady = false;
  let streaks = [];
  let studentFileHandle = null;
  let sessionStudents = [];
  let sessionResultsRecorded = false;
  let selectedGame = typeof currentGame === 'number' && GAME_META[currentGame] ? currentGame : 1;
  let measureNumberVisible = loadMeasureNumberVisible();
  let recordViewMode = 'game';
  let selectedRecordGame = 1;
  let selectedRecordStudentId = '';
  let studentSidebarOpen = false;
  const studentState = loadStudentState();

  protractorImage.onload = () => {
    protractorReady = true;
    playerData.forEach((data, idx) => {
      if (isMeasureMode(data)) window.redrawShape?.(idx);
    });
  };
  protractorImage.src = PROTRACTOR_SOURCE;
  if (protractorImage.complete && protractorImage.naturalWidth > 0) protractorReady = true;

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max) { return Math.random() * (max - min) + min; }
  function randAngle5(min, max) { return randInt(Math.ceil(min / 5), Math.floor(max / 5)) * 5; }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function degToRad(value) { return value * DEG; }
  function radToDeg(value) { return value / DEG; }
  function lerp(start, end, t) { return start + (end - start) * t; }
  function lerpAngle(start, end, t) {
    let delta = ((end - start + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return start + delta * t;
  }
  function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function normalizeVector(x, y) {
    const len = Math.hypot(x, y) || 1;
    return [x / len, y / len];
  }
  function normalizeAngle(angle) {
    let result = angle % (Math.PI * 2);
    if (result < 0) result += Math.PI * 2;
    return result;
  }
  function clockwiseDelta(fromAngle, toAngle) { return normalizeAngle(fromAngle - toAngle); }
  function useShortArc(startAngle, endAngle) {
    const fullTurn = Math.PI * 2;
    const cw = (endAngle - startAngle + fullTurn) % fullTurn;
    const ccw = (startAngle - endAngle + fullTurn) % fullTurn;
    return ccw < cw;
  }

  function setCanvasBackingSize(canvas, width, height) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
  }

  function isMeasureMode(data) {
    return data?.mode === 'measure' || data?.mode === 'measure-tutorial';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]
    ));
  }

  function normalizeStudentName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function createStudentId(index = 0) {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `student-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function normalizeAssignmentMode(value) {
    return Object.prototype.hasOwnProperty.call(ASSIGNMENT_OPTIONS, value) ? value : 'none';
  }

  function normalizeTimerPreset(value) {
    return Object.prototype.hasOwnProperty.call(TIMER_OPTIONS, value) ? value : '60';
  }

  function normalizeGameNumber(value) {
    const parsed = Number.parseInt(value, 10);
    return GAME_META[parsed] ? parsed : 1;
  }

  function normalizeCustomTimerSeconds(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_CUSTOM_TIMER_SECONDS;
    return clamp(parsed, 5, 3600);
  }

  function loadMeasureNumberVisible() {
    try {
      const saved = localStorage.getItem(MEASURE_NUMBER_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch (error) {
      return true;
    }
  }

  function saveMeasureNumberVisible() {
    try {
      localStorage.setItem(MEASURE_NUMBER_STORAGE_KEY, String(measureNumberVisible));
    } catch (error) {
      // localStorage may be unavailable on some file:// launches.
    }
  }

  function normalizeStudentRecords(rawRecords) {
    if (!Array.isArray(rawRecords)) return [];
    return rawRecords.map((record) => {
      const score = Number.parseInt(record?.score, 10);
      if (!Number.isFinite(score)) return null;
      const game = GAME_META[record?.game] ? Number(record.game) : null;
      return {
        score,
        game,
        timestamp: typeof record?.timestamp === 'string' ? record.timestamp : new Date().toISOString(),
        timerSeconds: Number.isFinite(Number(record?.timerSeconds)) ? Number(record.timerSeconds) : null
      };
    }).filter(Boolean);
  }

  function normalizeStudentEntry(rawStudent, index) {
    const candidate = typeof rawStudent === 'string' ? { name: rawStudent } : rawStudent;
    const name = normalizeStudentName(candidate?.name);
    if (!name) return null;
    return {
      id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : createStudentId(index),
      name,
      records: normalizeStudentRecords(candidate?.records)
    };
  }

  function normalizeStudentList(rawStudents) {
    if (!Array.isArray(rawStudents)) return [];
    return rawStudents.map((student, index) => normalizeStudentEntry(student, index)).filter(Boolean);
  }

  function normalizeStudentState(rawState = {}) {
    const students = normalizeStudentList(rawState.students);
    const validIds = new Set(students.map((student) => student.id));
    return {
      students,
      assignmentMode: normalizeAssignmentMode(rawState.assignmentMode),
      sequenceCursor: Number.isInteger(rawState.sequenceCursor) ? Math.max(0, rawState.sequenceCursor) : 0,
      timerPreset: normalizeTimerPreset(rawState.timerPreset),
      customTimerSeconds: normalizeCustomTimerSeconds(rawState.customTimerSeconds),
      fileName: typeof rawState.fileName === 'string' ? rawState.fileName : '',
      activeStudentIds: Array.isArray(rawState.activeStudentIds)
        ? rawState.activeStudentIds.filter((id) => typeof id === 'string' && validIds.has(id))
        : [],
      playedStudentIds: Array.isArray(rawState.playedStudentIds)
        ? rawState.playedStudentIds.filter((id) => typeof id === 'string' && validIds.has(id))
        : [],
      repeatSelectedStudents: Boolean(rawState.repeatSelectedStudents)
    };
  }

  function loadStudentState() {
    try {
      return normalizeStudentState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
    } catch (error) {
      return normalizeStudentState();
    }
  }

  function saveStudentState() {
    studentState.activeStudentIds = getValidStudentIds(studentState.activeStudentIds);
    studentState.playedStudentIds = getValidStudentIds(studentState.playedStudentIds);
    if (!studentState.students.length) studentState.sequenceCursor = 0;
    if (studentState.students.length) studentState.sequenceCursor %= studentState.students.length;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        students: studentState.students,
        assignmentMode: studentState.assignmentMode,
        sequenceCursor: studentState.sequenceCursor,
        timerPreset: studentState.timerPreset,
        customTimerSeconds: studentState.customTimerSeconds,
        fileName: studentState.fileName,
        activeStudentIds: studentState.activeStudentIds,
        playedStudentIds: studentState.playedStudentIds,
        repeatSelectedStudents: studentState.repeatSelectedStudents
      }));
    } catch (error) {
      // Ignore localStorage failures and keep the in-memory state alive.
    }
  }

  function buildStudentExport() {
    return {
      exportedAt: new Date().toISOString(),
      students: studentState.students,
      assignmentMode: studentState.assignmentMode,
      sequenceCursor: studentState.sequenceCursor,
      timerPreset: studentState.timerPreset,
      customTimerSeconds: studentState.customTimerSeconds,
      activeStudentIds: studentState.activeStudentIds,
      playedStudentIds: studentState.playedStudentIds,
      repeatSelectedStudents: studentState.repeatSelectedStudents
    };
  }

  function parseStudentNames(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((name) => normalizeStudentName(name))
      .filter(Boolean);
  }

  function mergeStudentsByName(names) {
    const existingQueues = new Map();
    studentState.students.forEach((student) => {
      if (!existingQueues.has(student.name)) existingQueues.set(student.name, []);
      existingQueues.get(student.name).push(student);
    });

    return names.map((name, index) => {
      const queue = existingQueues.get(name);
      if (queue?.length) {
        const reused = queue.shift();
        return { ...reused, name };
      }
      return {
        id: createStudentId(index),
        name,
        records: []
      };
    });
  }

  function getStudentOrder(studentId) {
    return studentState.students.findIndex((student) => student.id === studentId) + 1;
  }

  function getStudentById(studentId) {
    return studentState.students.find((student) => student.id === studentId) || null;
  }

  function getValidStudentIds(ids) {
    const validIds = new Set(studentState.students.map((student) => student.id));
    const seen = new Set();
    return (Array.isArray(ids) ? ids : []).filter((id) => {
      if (typeof id !== 'string' || !validIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function getRequiredStudentCount() {
    if (!playerCount || !studentState.students.length || studentState.assignmentMode === 'none') return 0;
    return Math.min(playerCount, studentState.students.length);
  }

  function getActiveStudentIds() {
    return getValidStudentIds(studentState.activeStudentIds);
  }

  function getPlayedStudentIds() {
    return getValidStudentIds(studentState.playedStudentIds);
  }

  function getPendingStudents() {
    const playedIds = new Set(getPlayedStudentIds());
    return studentState.students.filter((student) => !playedIds.has(student.id));
  }

  function getParticipationCounts() {
    const playedCount = getPlayedStudentIds().length;
    return {
      total: studentState.students.length,
      played: playedCount,
      pending: Math.max(0, studentState.students.length - playedCount),
      next: getActiveStudentIds().length
    };
  }

  function getConfiguredTimerSeconds() {
    if (studentState.timerPreset === 'none') return null;
    if (studentState.timerPreset === 'custom') return studentState.customTimerSeconds;
    return TIMER_OPTIONS[studentState.timerPreset]?.seconds ?? 60;
  }

  function getConfiguredTimerLabel() {
    if (studentState.timerPreset === 'custom') return `${studentState.customTimerSeconds}초`;
    return TIMER_OPTIONS[studentState.timerPreset]?.label ?? '1분';
  }

  function formatTimerValue(value) {
    if (value === null) return '∞';
    const safeValue = Math.max(0, Number(value) || 0);
    const minutes = Math.floor(safeValue / 60);
    const seconds = safeValue % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function formatAverageScore(records) {
    if (!records.length) return '-';
    const average = records.reduce((sum, record) => sum + record.score, 0) / records.length;
    return `${Number.isInteger(average) ? average.toFixed(0) : average.toFixed(1)}점`;
  }

  function getRecordTimestamp(record) {
    const time = Date.parse(record?.timestamp || '');
    return Number.isNaN(time) ? 0 : time;
  }

  function sortRecordsNewest(records) {
    return (records || []).slice().sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
  }

  function getRecentRecords(records, count = 5) {
    return sortRecordsNewest(records).slice(0, count);
  }

  function getLatestRecord(records) {
    return sortRecordsNewest(records)[0] || null;
  }

  function getStudentGameRecords(student, gameNum = null) {
    const records = Array.isArray(student?.records) ? student.records : [];
    if (!gameNum) return records;
    return records.filter((record) => Number(record.game) === Number(gameNum));
  }

  function getBestScore(records) {
    if (!records.length) return '-';
    return `${Math.max(...records.map((record) => record.score))}점`;
  }

  function getTotalRecordCount() {
    return studentState.students.reduce((sum, student) => sum + getStudentGameRecords(student).length, 0);
  }

  function formatTimerSetting(seconds) {
    if (seconds === null) return '무제한';
    if (!Number.isFinite(Number(seconds))) return '-';
    const safeSeconds = Math.max(0, Number(seconds));
    if (safeSeconds < 60) return `${safeSeconds}초`;
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return rest ? `${minutes}분 ${rest}초` : `${minutes}분`;
  }

  function formatLatestRecordSummary(record, options = {}) {
    if (!record) return '-';
    const parts = [];
    if (options.includeGame && record.game) parts.push(GAME_META[record.game]?.title || '기록');
    parts.push(`${record.score}점`);
    const date = formatRecordDate(record.timestamp);
    if (date) parts.push(date);
    return parts.join(' · ');
  }

  function formatRecordDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getPlayerLabel(idx) {
    const student = sessionStudents[idx];
    if (!student) return `${ANIMALS[idx].emoji} ${ANIMALS[idx].name}`;
    return `${ANIMALS[idx].emoji} ${getStudentOrder(student.id)}번 ${student.name}`;
  }

  function getPlayerSubLabel(idx) {
    const student = sessionStudents[idx];
    return student ? `${ANIMALS[idx].name} 자리` : '';
  }

  function getPlayerLabelFromList(idx, students = sessionStudents) {
    const student = students[idx];
    if (!student) return `${ANIMALS[idx].emoji} ${ANIMALS[idx].name}`;
    return `${ANIMALS[idx].emoji} ${getStudentOrder(student.id)}번 ${student.name}`;
  }

  function getPlayerSubLabelFromList(idx, students = sessionStudents) {
    const student = students[idx];
    return student ? `${ANIMALS[idx].name} 자리` : '';
  }

  function buildPreviewList(count = playerCount) {
    return Array.from({ length: count }, (_, idx) => getPlayerLabel(idx));
  }

  function pickSequentialStudentIds(count) {
    if (!studentState.students.length) return [];
    const start = studentState.sequenceCursor % studentState.students.length;
    const pickCount = Math.min(count, studentState.students.length);
    const result = [];
    for (let idx = 0; idx < pickCount; idx += 1) {
      result.push(studentState.students[(start + idx) % studentState.students.length].id);
    }
    studentState.sequenceCursor = (start + pickCount) % studentState.students.length;
    return result;
  }

  function pickRandomStudentIds(count) {
    const pool = studentState.students.slice();
    for (let idx = pool.length - 1; idx > 0; idx -= 1) {
      const swapIndex = randInt(0, idx);
      [pool[idx], pool[swapIndex]] = [pool[swapIndex], pool[idx]];
    }
    return pool.slice(0, Math.min(count, pool.length)).map((student) => student.id);
  }

  function orderCandidateStudents(students) {
    const ordered = students.slice();
    if (studentState.assignmentMode !== 'random') return ordered;
    for (let idx = ordered.length - 1; idx > 0; idx -= 1) {
      const swapIndex = randInt(0, idx);
      [ordered[idx], ordered[swapIndex]] = [ordered[swapIndex], ordered[idx]];
    }
    return ordered;
  }

  function pickNextUnplayedStudentIds(count, options = {}) {
    const { resetIfComplete = false } = options;
    if (!count || !studentState.students.length || studentState.assignmentMode === 'none') return [];
    let candidates = getPendingStudents();
    if (!candidates.length && resetIfComplete) {
      studentState.playedStudentIds = [];
      candidates = studentState.students.slice();
    }
    return orderCandidateStudents(candidates).slice(0, count).map((student) => student.id);
  }

  function syncSessionStudentsFromActive() {
    const lookup = new Map(studentState.students.map((student) => [student.id, student]));
    const activeIds = getActiveStudentIds();
    studentState.activeStudentIds = activeIds;
    sessionStudents = Array.from({ length: playerCount || 0 }, (_, idx) => lookup.get(activeIds[idx]) || null);
  }

  function sessionMatchesActiveStudents() {
    const requiredCount = getRequiredStudentCount();
    if (!requiredCount) return true;
    const activeIds = getActiveStudentIds().slice(0, requiredCount);
    const sessionIds = sessionStudents.slice(0, requiredCount).map((student) => student?.id || '');
    if (activeIds.length !== requiredCount || sessionIds.length !== requiredCount) return false;
    return activeIds.every((id, idx) => id === sessionIds[idx]);
  }

  function assignNextUnplayedStudents(options = {}) {
    const { resetIfComplete = false, preserveSession = false } = options;
    const requiredCount = getRequiredStudentCount();
    studentState.activeStudentIds = pickNextUnplayedStudentIds(requiredCount, { resetIfComplete });
    saveStudentState();
    if (!preserveSession) syncSessionStudentsFromActive();
    renderStudentUi();
  }

  function setActiveStudentIds(ids, options = {}) {
    const { preserveSession = false } = options;
    studentState.activeStudentIds = getValidStudentIds(ids);
    saveStudentState();
    if (!preserveSession) syncSessionStudentsFromActive();
    renderStudentUi();
  }

  function resetParticipationCycle() {
    studentState.playedStudentIds = [];
    studentState.repeatSelectedStudents = false;
    assignNextUnplayedStudents({ resetIfComplete: true });
  }

  function toggleStudentForNext(studentId) {
    if (!getStudentById(studentId) || studentState.assignmentMode === 'none') return;
    const requiredCount = getRequiredStudentCount();
    if (!requiredCount) return;
    const activeIds = getActiveStudentIds();
    const existingIndex = activeIds.indexOf(studentId);
    if (existingIndex >= 0) {
      activeIds.splice(existingIndex, 1);
      setActiveStudentIds(activeIds);
      return;
    }
    if (activeIds.length >= requiredCount) {
      const hint = document.getElementById('ag-assigned-hint');
      if (hint) hint.textContent = `다음 게임 명단은 최대 ${requiredCount}명입니다. 먼저 선택된 학생을 해제하세요.`;
      return;
    }
    activeIds.push(studentId);
    setActiveStudentIds(activeIds);
  }

  function markSessionStudentsAsPlayed() {
    const playedIds = new Set(getPlayedStudentIds());
    sessionStudents.forEach((student) => {
      if (student?.id) playedIds.add(student.id);
    });
    studentState.playedStudentIds = studentState.students
      .map((student) => student.id)
      .filter((id) => playedIds.has(id));
  }

  function prepareAssignmentsAfterResult() {
    if (!studentState.students.length || studentState.assignmentMode === 'none') return;
    if (studentState.repeatSelectedStudents) {
      syncSessionStudentsFromActive();
      saveStudentState();
      renderStudentUi();
      return;
    }
    const requiredCount = getRequiredStudentCount();
    studentState.activeStudentIds = pickNextUnplayedStudentIds(requiredCount, { resetIfComplete: false });
    saveStudentState();
    syncSessionStudentsFromActive();
    renderStudentUi();
  }

  function updateStudentPreviewBars() {
    ['animals-preview', 'animals-bar-game'].forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      if (!playerCount) return;
      const previewCount = studentState.assignmentMode !== 'none' && getActiveStudentIds().length
        ? getActiveStudentIds().length
        : playerCount;
      buildPreviewList(previewCount).forEach((label) => {
        const tag = document.createElement('span');
        tag.className = 'animal-tag';
        tag.textContent = label;
        container.appendChild(tag);
      });
    });
  }

  function setStudentStatus(message, type = 'info') {
    const status = document.getElementById('ag-student-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type;
  }

  function syncStudentTextarea() {
    const textarea = document.getElementById('ag-student-names');
    if (!textarea) return;
    textarea.value = studentState.students.map((student) => student.name).join('\n');
  }

  function updateStudentSummary() {
    const summary = document.getElementById('ag-roster-summary');
    if (!summary) return;
    if (!studentState.students.length) {
      summary.textContent = '학생 이름 없이도 기존 동물 이름으로 바로 플레이할 수 있습니다.';
      return;
    }
    summary.textContent = `등록 학생 ${studentState.students.length}명 · 지정 방식 ${ASSIGNMENT_OPTIONS[studentState.assignmentMode]} · 타이머 ${getConfiguredTimerLabel()}`;
  }

  function updateStudentFileBadge() {
    const badge = document.getElementById('ag-student-file-badge');
    if (!badge) return;
    if (studentFileHandle?.name) {
      badge.textContent = `연결 파일: ${studentFileHandle.name}`;
      return;
    }
    if (studentState.fileName) {
      badge.textContent = `최근 파일: ${studentState.fileName}`;
      return;
    }
    badge.textContent = '파일 연결 없음';
  }

  function updateAssignmentControls() {
    const select = document.getElementById('ag-assignment-mode');
    const rerollButton = document.getElementById('ag-reroll-students');
    const clearButton = document.getElementById('ag-clear-next-students');
    const resetButton = document.getElementById('ag-reset-rotation');
    const repeatButton = document.getElementById('ag-repeat-selected');
    const requiredCount = getRequiredStudentCount();
    const counts = getParticipationCounts();
    if (select) select.value = studentState.assignmentMode;
    const disabled = !playerCount || !studentState.students.length || studentState.assignmentMode === 'none';
    if (rerollButton) {
      rerollButton.disabled = disabled;
      rerollButton.textContent = counts.pending ? '다음 미참여자 자동 배정' : '새 순환 시작';
    }
    if (clearButton) clearButton.disabled = disabled || !counts.next;
    if (resetButton) resetButton.disabled = !studentState.students.length || studentState.assignmentMode === 'none';
    if (repeatButton) {
      repeatButton.disabled = disabled || !counts.next;
      repeatButton.textContent = studentState.repeatSelectedStudents ? '선택 명단 반복 켜짐' : '선택 명단 반복 꺼짐';
      repeatButton.classList.toggle('is-active', studentState.repeatSelectedStudents);
    }

    const hint = document.getElementById('ag-assigned-hint');
    if (!hint) return;
    if (!playerCount) {
      hint.textContent = '참가 인원을 먼저 선택하면 여기서 현재 참가 학생을 확인할 수 있습니다.';
      return;
    }
    if (!studentState.students.length) {
      hint.textContent = '학생 명단이 비어 있어 동물 이름만으로 플레이합니다.';
      return;
    }
    if (studentState.assignmentMode === 'none') {
      hint.textContent = '학생 이름을 쓰지 않고 기존 동물 이름만으로 플레이합니다.';
      return;
    }
    if (!counts.next) {
      hint.textContent = counts.pending
        ? `아직 해야 하는 학생 ${counts.pending}명이 있습니다. 자동 배정을 누르면 다음 ${Math.min(requiredCount, counts.pending)}명을 채웁니다.`
        : '이번 순환의 모든 학생이 참여했습니다. 새 순환 시작을 누르면 다시 처음부터 배정합니다.';
      return;
    }
    hint.textContent = `${ASSIGNMENT_OPTIONS[studentState.assignmentMode]} · 다음 게임 ${counts.next}/${requiredCount}명 · 완료 ${counts.played}명 · 남음 ${counts.pending}명`;
  }

  function updateTimerControls() {
    const preset = document.getElementById('ag-timer-preset');
    const customInput = document.getElementById('ag-custom-timer');
    if (preset) preset.value = studentState.timerPreset;
    if (customInput) {
      customInput.value = String(studentState.customTimerSeconds);
      customInput.hidden = studentState.timerPreset !== 'custom';
      customInput.disabled = studentState.timerPreset !== 'custom';
    }
  }

  function updatePlayerCountControls() {
    document.querySelectorAll('.ag-count-btn').forEach((button) => {
      const count = Number.parseInt(button.dataset.count, 10);
      const active = count === playerCount;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const hint = document.getElementById('ag-player-count-hint');
    if (hint) {
      hint.textContent = playerCount
        ? `${playerCount}명 플레이로 설정했습니다.`
        : '참가 인원을 먼저 고르면 그 인원 수로 게임이 바로 시작됩니다.';
    }

    const rosterCount = document.getElementById('ag-roster-player-count');
    if (rosterCount) {
      rosterCount.textContent = playerCount
        ? `현재 참가 인원 ${playerCount}명`
        : '현재 참가 인원을 아직 고르지 않았습니다.';
    }
  }

  function updateSelectedGameControls() {
    document.querySelectorAll('#game-select-screen .game-card').forEach((card) => {
      const active = Number.parseInt(card.dataset.game, 10) === selectedGame;
      card.classList.toggle('ag-selected-card', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateStartButton() {
    return;
  }

  function setStudentSidebarOpen(open) {
    studentSidebarOpen = !!open;
    document.getElementById('ag-student-sidebar')?.classList.toggle('is-open', studentSidebarOpen);
    document.getElementById('ag-sidebar-backdrop')?.classList.toggle('is-open', studentSidebarOpen);
    document.body.classList.toggle('ag-sidebar-open', studentSidebarOpen);
    const trigger = document.getElementById('ag-toggle-sidebar');
    if (trigger) {
      trigger.classList.toggle('is-active', studentSidebarOpen);
      trigger.setAttribute('aria-expanded', studentSidebarOpen ? 'true' : 'false');
      trigger.textContent = studentSidebarOpen ? '학생 관리 닫기' : '학생 관리 열기';
    }
  }

  function updateSidebarSummary() {
    const summary = document.getElementById('ag-sidebar-summary');
    const badge = document.getElementById('ag-sidebar-badge');
    const copy = document.getElementById('ag-sidebar-copy');
    const count = studentState.students.length;
    const counts = getParticipationCounts();

    if (badge) {
      badge.textContent = count ? `등록 ${count}명` : '명단 없음';
    }

    if (summary) {
      if (!count) {
        summary.textContent = '학생 이름 없이도 바로 플레이할 수 있습니다.';
      } else if (studentState.assignmentMode === 'none') {
        summary.textContent = `학생 ${count}명 등록됨 · 학생 이름 사용 안 함`;
      } else {
        summary.textContent = `${ASSIGNMENT_OPTIONS[studentState.assignmentMode]} · 다음 ${counts.next}명 · 남음 ${counts.pending}명`;
      }
    }

    if (copy) {
      if (!count) {
        copy.textContent = '명단을 저장하면 번호순, 랜덤 지정과 참여 순환을 여기서 바로 관리할 수 있습니다.';
      } else if (studentState.assignmentMode === 'none') {
        copy.textContent = '학생 이름 사용 안 함 상태입니다. 지정 방식을 바꾸면 참여 순환 추적을 시작합니다.';
      } else {
        copy.textContent = `현재 ${ASSIGNMENT_OPTIONS[studentState.assignmentMode]} 기준으로 학생 참여 순환을 관리하고 있습니다.`;
      }
    }
  }

  function updateRosterPreviewCard() {
    const copy = document.getElementById('ag-roster-card-copy');
    if (!copy) return;
    if (!studentState.students.length) {
      copy.textContent = '학생 이름 없이도 그대로 플레이할 수 있습니다. 명단을 저장하면 게임 선택 화면에서 번호순 또는 랜덤 배정을 바로 쓸 수 있습니다.';
      return;
    }
    copy.textContent = playerCount
      ? `저장된 학생 ${studentState.students.length}명 중 현재 ${playerCount}명 기준으로 미리보기를 보여줍니다.`
      : `저장된 학생 ${studentState.students.length}명입니다. 게임 선택 화면에서 참가 인원을 고르면 여기 미리보기가 함께 바뀝니다.`;
  }

  function renderSelectionUi() {
    updatePlayerCountControls();
    updateSelectedGameControls();
    updateStartButton();
    updateSidebarSummary();
    updateRosterPreviewCard();
    renderRotationBoard();
  }

  function renderRotationBoard() {
    const list = document.getElementById('ag-rotation-list');
    const nextList = document.getElementById('ag-next-students');
    const summary = document.getElementById('ag-rotation-summary');
    const requiredCount = getRequiredStudentCount();
    const counts = getParticipationCounts();
    const activeIds = getActiveStudentIds();
    const activeSet = new Set(activeIds);
    const playedSet = new Set(getPlayedStudentIds());

    if (summary) {
      if (!studentState.students.length) {
        summary.textContent = '학생 명단을 저장하면 참여 여부를 추적할 수 있습니다.';
      } else if (studentState.assignmentMode === 'none') {
        summary.textContent = '학생 이름 사용 안 함 상태입니다. 번호순 또는 랜덤으로 바꾸면 참여 추적을 시작합니다.';
      } else {
        summary.textContent = `다음 게임 ${counts.next}/${requiredCount}명 · 아직 ${counts.pending}명 · 완료 ${counts.played}명`;
      }
    }

    if (nextList) {
      nextList.innerHTML = '';
      if (!activeIds.length) {
        const empty = document.createElement('span');
        empty.className = 'ag-next-empty';
        empty.textContent = '다음 게임 명단이 비어 있습니다.';
        nextList.appendChild(empty);
      } else {
        activeIds.forEach((studentId, index) => {
          const student = getStudentById(studentId);
          if (!student) return;
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'ag-next-chip';
          chip.textContent = `${index + 1}. ${student.name}`;
          chip.title = '클릭하면 다음 게임 명단에서 해제됩니다.';
          chip.addEventListener('click', () => toggleStudentForNext(student.id));
          nextList.appendChild(chip);
        });
      }
    }

    if (!list) return;
    list.innerHTML = '';
    if (!studentState.students.length) {
      const empty = document.createElement('div');
      empty.className = 'ag-record-empty-note';
      empty.textContent = '학생 명단이 없습니다. 학생 명단 관리에서 이름을 먼저 저장하세요.';
      list.appendChild(empty);
      return;
    }

    studentState.students.forEach((student, index) => {
      const selected = activeSet.has(student.id);
      const played = playedSet.has(student.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-rotation-student';
      button.classList.toggle('is-next', selected);
      button.classList.toggle('is-done', played && !selected);
      button.classList.toggle('is-pending', !played && !selected);
      button.addEventListener('click', () => toggleStudentForNext(student.id));

      const stateLabel = selected ? '다음 게임' : played ? '완료' : '대기';
      button.innerHTML = `
        <span class="ag-rotation-name">${index + 1}. ${escapeHtml(student.name)}</span>
        <span class="ag-rotation-state">${stateLabel}</span>
      `;
      list.appendChild(button);
    });
  }

  function updateStudentStatsTable() {
    const body = document.getElementById('ag-student-stats-body');
    if (!body) return;
    body.innerHTML = '';

    if (!studentState.students.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'ag-empty-row';
      cell.textContent = '아직 저장된 학생 명단이 없습니다.';
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    studentState.students.forEach((student, index) => {
      const records = student.records || [];
      const latest = records[records.length - 1];
      const recentRecords = records.slice(-5);
      const row = document.createElement('tr');

      const orderCell = document.createElement('td');
      orderCell.textContent = String(index + 1);
      row.appendChild(orderCell);

      const nameCell = document.createElement('td');
      nameCell.className = 'ag-student-name-cell';
      nameCell.textContent = student.name;
      row.appendChild(nameCell);

      const averageCell = document.createElement('td');
      averageCell.textContent = formatAverageScore(records);
      row.appendChild(averageCell);

      const recentCell = document.createElement('td');
      recentCell.textContent = formatAverageScore(recentRecords);
      row.appendChild(recentCell);

      const latestCell = document.createElement('td');
      latestCell.className = 'ag-latest-cell';
      if (!latest) {
        latestCell.textContent = '-';
      } else {
        const score = document.createElement('div');
        score.className = 'ag-latest-score';
        score.textContent = `${latest.score}점`;
        latestCell.appendChild(score);

        const meta = document.createElement('div');
        meta.className = 'ag-latest-meta';
        const gameTitle = latest.game ? GAME_META[latest.game]?.title : '기록';
        meta.textContent = `${gameTitle} · ${formatRecordDate(latest.timestamp)}`;
        latestCell.appendChild(meta);
      }
      row.appendChild(latestCell);
      body.appendChild(row);
    });
  }

  function updateRosterRecordSummary() {
    const summary = document.getElementById('ag-roster-record-summary');
    if (!summary) return;
    const totalRecords = getTotalRecordCount();
    if (!studentState.students.length) {
      summary.textContent = '학생 명단을 저장하면 기록 화면에서 학생별, 게임별 기록을 볼 수 있습니다.';
      return;
    }
    if (!totalRecords) {
      summary.textContent = `등록 학생 ${studentState.students.length}명 · 아직 저장된 게임 기록은 없습니다.`;
      return;
    }
    const recordedGameCount = Object.keys(GAME_META).filter((gameNum) => (
      studentState.students.some((student) => getStudentGameRecords(student, Number(gameNum)).length)
    )).length;
    summary.textContent = `등록 학생 ${studentState.students.length}명 · 누적 기록 ${totalRecords}개 · 기록 있는 게임 ${recordedGameCount}개`;
  }

  function ensureRecordSelection() {
    if (!GAME_META[selectedRecordGame]) selectedRecordGame = 1;
    if (!studentState.students.some((student) => student.id === selectedRecordStudentId)) {
      selectedRecordStudentId = studentState.students[0]?.id || '';
    }
    if (recordViewMode !== 'student' && recordViewMode !== 'game') recordViewMode = 'game';
  }

  function appendRecordCell(row, text, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function appendEmptyRecordRow(body, colspan, message) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colspan;
    cell.className = 'ag-empty-row';
    cell.textContent = message;
    row.appendChild(cell);
    body.appendChild(row);
  }

  function summarizeRecordSet(records) {
    return {
      count: records.length,
      average: formatAverageScore(records),
      recentAverage: formatAverageScore(getRecentRecords(records, 5)),
      best: getBestScore(records),
      latest: formatLatestRecordSummary(getLatestRecord(records), { includeGame: true })
    };
  }

  function renderRecordSummaryCards(items) {
    const wrap = document.getElementById('ag-record-summary-cards');
    if (!wrap) return;
    wrap.innerHTML = '';
    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'ag-record-summary-card';
      card.innerHTML = `
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      `;
      wrap.appendChild(card);
    });
  }

  function renderRecordGameTabs() {
    const tabs = document.getElementById('ag-record-game-tabs');
    if (!tabs) return;
    tabs.innerHTML = '';
    Object.entries(GAME_META).forEach(([gameNum, meta]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-record-list-btn';
      button.classList.toggle('is-active', Number(gameNum) === Number(selectedRecordGame));
      button.textContent = `${meta.emoji} ${meta.title}`;
      button.addEventListener('click', () => {
        selectedRecordGame = Number(gameNum);
        renderRecordUi();
      });
      tabs.appendChild(button);
    });
  }

  function renderRecordStudentList() {
    const list = document.getElementById('ag-record-student-list');
    if (!list) return;
    list.innerHTML = '';
    if (!studentState.students.length) {
      const empty = document.createElement('div');
      empty.className = 'ag-record-empty-note';
      empty.textContent = '학생 명단이 없습니다.';
      list.appendChild(empty);
      return;
    }
    studentState.students.forEach((student, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ag-record-list-btn';
      button.classList.toggle('is-active', student.id === selectedRecordStudentId);
      button.textContent = `${index + 1}. ${student.name}`;
      button.addEventListener('click', () => {
        selectedRecordStudentId = student.id;
        recordViewMode = 'student';
        renderRecordUi();
      });
      list.appendChild(button);
    });
  }

  function renderGameRecordView() {
    const body = document.getElementById('ag-game-record-body');
    if (!body) return;
    body.innerHTML = '';
    const meta = GAME_META[selectedRecordGame] || GAME_META[1];
    const allRecords = studentState.students.flatMap((student) => getStudentGameRecords(student, selectedRecordGame));
    const summary = summarizeRecordSet(allRecords);

    const title = document.getElementById('ag-record-context-title');
    const copy = document.getElementById('ag-record-context-copy');
    if (title) title.textContent = `${meta.emoji} ${meta.title} 전체 기록`;
    if (copy) copy.textContent = '선택한 게임 기준으로 등록된 모든 학생의 기록을 한 번에 비교합니다.';
    renderRecordSummaryCards([
      { label: '전체 기록 수', value: `${summary.count}회` },
      { label: '전체 평균', value: summary.average },
      { label: '최근 5회 평균', value: summary.recentAverage },
      { label: '최고 점수', value: summary.best }
    ]);

    if (!studentState.students.length) {
      appendEmptyRecordRow(body, 7, '학생 명단이 없습니다. 학생 명단을 먼저 저장해 주세요.');
      return;
    }

    studentState.students.forEach((student, index) => {
      const records = getStudentGameRecords(student, selectedRecordGame);
      const row = document.createElement('tr');
      appendRecordCell(row, String(index + 1));
      const nameCell = appendRecordCell(row, student.name, 'ag-student-name-cell ag-clickable-cell');
      nameCell.addEventListener('click', () => {
        selectedRecordStudentId = student.id;
        recordViewMode = 'student';
        renderRecordUi();
      });
      appendRecordCell(row, `${records.length}회`);
      appendRecordCell(row, formatAverageScore(records));
      appendRecordCell(row, formatAverageScore(getRecentRecords(records, 5)));
      appendRecordCell(row, getBestScore(records));
      appendRecordCell(row, formatLatestRecordSummary(getLatestRecord(records)));
      body.appendChild(row);
    });
  }

  function renderStudentRecordView() {
    const summaryBody = document.getElementById('ag-student-game-record-body');
    const logBody = document.getElementById('ag-student-record-log-body');
    if (!summaryBody || !logBody) return;
    summaryBody.innerHTML = '';
    logBody.innerHTML = '';

    const student = getStudentById(selectedRecordStudentId);
    const title = document.getElementById('ag-record-context-title');
    const copy = document.getElementById('ag-record-context-copy');
    if (!student) {
      if (title) title.textContent = '학생별 상세 기록';
      if (copy) copy.textContent = '학생 명단을 먼저 저장해 주세요.';
      renderRecordSummaryCards([
        { label: '전체 기록 수', value: '0회' },
        { label: '전체 평균', value: '-' },
        { label: '최근 5회 평균', value: '-' },
        { label: '최신 기록', value: '-' }
      ]);
      appendEmptyRecordRow(summaryBody, 6, '학생 명단이 없습니다.');
      appendEmptyRecordRow(logBody, 4, '학생 명단이 없습니다.');
      return;
    }

    const allRecords = getStudentGameRecords(student);
    const summary = summarizeRecordSet(allRecords);
    if (title) title.textContent = `${student.name} 학생 상세 기록`;
    if (copy) copy.textContent = '학생 한 명의 여러 게임 기록을 게임별 요약과 전체 기록표로 확인합니다.';
    renderRecordSummaryCards([
      { label: '전체 기록 수', value: `${summary.count}회` },
      { label: '전체 평균', value: summary.average },
      { label: '최근 5회 평균', value: summary.recentAverage },
      { label: '최신 기록', value: summary.latest }
    ]);

    Object.entries(GAME_META).forEach(([gameNum, meta]) => {
      const records = getStudentGameRecords(student, Number(gameNum));
      const row = document.createElement('tr');
      appendRecordCell(row, meta.title);
      appendRecordCell(row, `${records.length}회`);
      appendRecordCell(row, formatAverageScore(records));
      appendRecordCell(row, formatAverageScore(getRecentRecords(records, 5)));
      appendRecordCell(row, getBestScore(records));
      appendRecordCell(row, formatLatestRecordSummary(getLatestRecord(records)));
      summaryBody.appendChild(row);
    });

    const sortedRecords = sortRecordsNewest(allRecords);
    if (!sortedRecords.length) {
      appendEmptyRecordRow(logBody, 4, '아직 저장된 기록이 없습니다.');
      return;
    }
    sortedRecords.forEach((record) => {
      const row = document.createElement('tr');
      appendRecordCell(row, formatRecordDate(record.timestamp) || '-');
      appendRecordCell(row, record.game ? GAME_META[record.game]?.title || '기록' : '기록');
      appendRecordCell(row, `${record.score}점`);
      appendRecordCell(row, formatTimerSetting(record.timerSeconds));
      logBody.appendChild(row);
    });
  }

  function renderRecordUi() {
    const screen = document.getElementById('ag-record-screen');
    if (!screen) return;
    ensureRecordSelection();

    document.querySelectorAll('[data-record-mode]').forEach((button) => {
      const active = button.dataset.recordMode === recordViewMode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const sideTitle = document.getElementById('ag-record-side-title');
    const gameTabs = document.getElementById('ag-record-game-tabs');
    const studentList = document.getElementById('ag-record-student-list');
    const gameView = document.getElementById('ag-record-game-view');
    const studentView = document.getElementById('ag-record-student-view');

    if (sideTitle) sideTitle.textContent = recordViewMode === 'game' ? '게임 선택' : '학생 선택';
    if (gameTabs) gameTabs.hidden = recordViewMode !== 'game';
    if (studentList) studentList.hidden = recordViewMode !== 'student';
    if (gameView) gameView.hidden = recordViewMode !== 'game';
    if (studentView) studentView.hidden = recordViewMode !== 'student';

    const badge = document.getElementById('ag-record-count-badge');
    if (badge) badge.textContent = `누적 기록 ${getTotalRecordCount()}개`;

    renderRecordGameTabs();
    renderRecordStudentList();
    if (recordViewMode === 'game') renderGameRecordView();
    else renderStudentRecordView();
  }

  function openRecordScreen(mode = recordViewMode) {
    recordViewMode = mode === 'student' ? 'student' : 'game';
    if (recordViewMode === 'game' && GAME_META[selectedGame]) selectedRecordGame = selectedGame;
    setStudentSidebarOpen(false);
    renderRecordUi();
    showScreen('ag-record-screen');
  }

  function renderStudentUi() {
    updateStudentPreviewBars();
    updateStudentSummary();
    updateStudentFileBadge();
    updateAssignmentControls();
    updateTimerControls();
    updateStudentStatsTable();
    updateRosterRecordSummary();
    renderSelectionUi();
    renderRecordUi();
  }

  function refreshStudentAssignments(options = {}) {
    const { advance = false, resetIfComplete = true } = options;
    if (!playerCount) {
      sessionStudents = [];
      studentState.activeStudentIds = [];
      saveStudentState();
      renderStudentUi();
      return;
    }

    if (!studentState.students.length || studentState.assignmentMode === 'none') {
      sessionStudents = Array(playerCount).fill(null);
      studentState.activeStudentIds = [];
      saveStudentState();
      renderStudentUi();
      return;
    }

    const requiredCount = getRequiredStudentCount();
    let activeIds = getActiveStudentIds();
    if (advance || activeIds.length !== requiredCount) {
      activeIds = pickNextUnplayedStudentIds(requiredCount, { resetIfComplete });
      studentState.activeStudentIds = activeIds;
    }

    saveStudentState();
    syncSessionStudentsFromActive();
    renderStudentUi();
  }

  async function saveStudentsToFile(options = {}) {
    const {
      forcePicker = false,
      quiet = false,
      allowDownloadFallback = true
    } = options;

    const fileContents = JSON.stringify(buildStudentExport(), null, 2);

    try {
      if ((forcePicker || !studentFileHandle) && typeof window.showSaveFilePicker === 'function') {
        studentFileHandle = await window.showSaveFilePicker({
          suggestedName: studentState.fileName || EXPORT_FILE_NAME,
          types: [{
            description: 'Angleman student data',
            accept: { 'application/json': ['.json'] }
          }]
        });
        studentState.fileName = studentFileHandle.name;
        saveStudentState();
      }

      if (studentFileHandle) {
        const writable = await studentFileHandle.createWritable();
        await writable.write(fileContents);
        await writable.close();
        studentState.fileName = studentFileHandle.name;
        saveStudentState();
        renderStudentUi();
        if (!quiet) setStudentStatus(`${studentFileHandle.name} 파일에 저장했습니다.`, 'success');
        return true;
      }

      if (allowDownloadFallback) {
        const blob = new Blob([fileContents], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = studentState.fileName || EXPORT_FILE_NAME;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        studentState.fileName = studentState.fileName || EXPORT_FILE_NAME;
        saveStudentState();
        renderStudentUi();
        if (!quiet) setStudentStatus('브라우저 다운로드로 학생 파일을 저장했습니다.', 'success');
        return true;
      }

      return false;
    } catch (error) {
      if (error?.name === 'AbortError') {
        if (!quiet) setStudentStatus('파일 저장을 취소했습니다.', 'info');
        return false;
      }
      if (!quiet) setStudentStatus('파일 저장 중 오류가 발생했습니다.', 'error');
      return false;
    }
  }

  function queueConnectedFileSave() {
    if (!studentFileHandle) return;
    void saveStudentsToFile({ quiet: true, allowDownloadFallback: false });
  }

  async function importStudentsFromFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      let nextState;
      try {
        const parsed = JSON.parse(text);
        nextState = normalizeStudentState(Array.isArray(parsed) ? { students: parsed } : parsed);
      } catch (error) {
        nextState = {
          students: mergeStudentsByName(parseStudentNames(text)),
          assignmentMode: studentState.assignmentMode,
          sequenceCursor: studentState.sequenceCursor,
          timerPreset: studentState.timerPreset,
          customTimerSeconds: studentState.customTimerSeconds,
          activeStudentIds: [],
          playedStudentIds: [],
          repeatSelectedStudents: studentState.repeatSelectedStudents
        };
      }

      studentState.students = nextState.students;
      studentState.assignmentMode = nextState.assignmentMode;
      studentState.sequenceCursor = nextState.sequenceCursor;
      studentState.timerPreset = nextState.timerPreset;
      studentState.customTimerSeconds = nextState.customTimerSeconds;
      studentState.activeStudentIds = nextState.activeStudentIds;
      studentState.playedStudentIds = nextState.playedStudentIds;
      studentState.repeatSelectedStudents = nextState.repeatSelectedStudents;
      studentState.fileName = file.name;
      saveStudentState();
      syncStudentTextarea();
      refreshStudentAssignments({ advance: playerCount > 0 && !studentState.activeStudentIds.length });
      setStudentStatus(`${file.name} 파일에서 학생 명단을 불러왔습니다.`, 'success');
    } catch (error) {
      setStudentStatus('파일을 불러오는 중 오류가 발생했습니다.', 'error');
    }
  }

  function saveRosterFromTextarea() {
    const textarea = document.getElementById('ag-student-names');
    if (!textarea) return;
    const names = parseStudentNames(textarea.value);
    studentState.students = mergeStudentsByName(names);
    studentState.activeStudentIds = [];
    studentState.playedStudentIds = [];
    studentState.repeatSelectedStudents = false;
    if (!studentState.students.length) studentState.sequenceCursor = 0;
    else studentState.sequenceCursor %= studentState.students.length;
    saveStudentState();
    syncStudentTextarea();
    refreshStudentAssignments({ advance: true });
    setStudentStatus(
      studentState.students.length
        ? `학생 ${studentState.students.length}명을 저장했습니다.`
        : '학생 명단을 비웠습니다. 게임은 동물 이름으로 그대로 진행됩니다.',
      'success'
    );
    queueConnectedFileSave();
  }

  function bootstrapUi() {
    const existingStyle = document.getElementById('ag-override-style');
    if (existingStyle) existingStyle.remove();

    const style = document.createElement('style');
    style.id = 'ag-override-style';
    style.textContent = `
      #player-screen,
      #game-select-screen,
      #ag-record-screen {
        justify-content:flex-start;
        padding:88px 28px 32px;
        overflow:auto;
        gap:20px;
      }
      #player-screen,
      #game-select-screen,
      #ag-record-screen {
        align-items:center;
      }
      .ag-player-layout {
        width:min(1180px, 100%);
        display:grid;
        grid-template-columns:minmax(320px, 380px) minmax(520px, 1fr);
        gap:24px;
        align-items:start;
      }
      .ag-panel {
        background:rgba(255,255,255,0.9);
        border:1px solid rgba(74,74,74,0.08);
        border-radius:24px;
        box-shadow:0 18px 40px rgba(91, 88, 116, 0.08);
        padding:24px;
      }
      .ag-panel h3,
      .ag-panel h4 {
        margin:0;
        color:#3f3d46;
      }
      .ag-panel p {
        margin:0;
      }
      .ag-player-card {
        display:flex;
        flex-direction:column;
        gap:18px;
      }
      .ag-player-card .player-grid {
        display:none !important;
      }
      .ag-player-card .section-title {
        margin:0;
      }
      .ag-roster-preview {
        min-height:56px;
        justify-content:flex-start;
      }
      .ag-roster-chip {
        align-self:flex-start;
      }
      .ag-card-copy {
        color:#76708a;
        font-size:15px;
        line-height:1.5;
      }
      .ag-student-card {
        display:flex;
        flex-direction:column;
        gap:18px;
      }
      .ag-panel-head {
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:flex-start;
      }
      .ag-panel-head p {
        margin-top:6px;
        color:#7f7a92;
        font-size:14px;
      }
      .ag-file-badge,
      .ag-chip {
        display:inline-flex;
        align-items:center;
        border-radius:999px;
        padding:8px 12px;
        background:#f3efff;
        color:#6e57d2;
        font-size:13px;
        font-weight:700;
        white-space:nowrap;
      }
      .ag-student-grid {
        display:grid;
        grid-template-columns:minmax(260px, 320px) minmax(0, 1fr);
        gap:18px;
        align-items:start;
      }
      .ag-field-label {
        display:block;
        margin-bottom:8px;
        color:#5d566d;
        font-size:14px;
        font-weight:700;
      }
      .ag-textarea {
        width:100%;
        min-height:260px;
        resize:vertical;
        border:1px solid rgba(74,74,74,0.12);
        border-radius:18px;
        padding:14px 16px;
        font:600 15px/1.6 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        color:#3f3d46;
        background:#fcfbff;
      }
      .ag-actions {
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:12px;
      }
      .ag-primary-btn,
      .ag-secondary-btn {
        border:none;
        border-radius:14px;
        padding:12px 16px;
        font:700 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
        transition:transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      }
      .ag-primary-btn {
        background:#6c63ff;
        color:#fff;
        box-shadow:0 12px 24px rgba(108,99,255,0.22);
      }
      .ag-secondary-btn {
        background:#eef1f7;
        color:#3f3d46;
      }
      .ag-primary-btn:hover,
      .ag-secondary-btn:hover {
        transform:translateY(-1px);
      }
      .ag-secondary-btn:disabled {
        cursor:not-allowed;
        opacity:0.45;
        transform:none;
      }
      .ag-helper {
        margin-top:10px;
        color:#8b86a0;
        font-size:13px;
        line-height:1.5;
      }
      .ag-status {
        margin-top:12px;
        border-radius:16px;
        padding:12px 14px;
        background:#f7f5ff;
        color:#615d73;
        font-size:13px;
        font-weight:600;
      }
      .ag-status[data-state="success"] {
        background:#ebfff0;
        color:#1f7a36;
      }
      .ag-status[data-state="error"] {
        background:#fff1f1;
        color:#b23a3a;
      }
      .ag-stats-wrap {
        border:1px solid rgba(74,74,74,0.08);
        border-radius:20px;
        overflow:hidden;
        background:#fff;
      }
      .ag-stats-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        padding:14px 16px;
        border-bottom:1px solid rgba(74,74,74,0.08);
        background:#fcfbff;
      }
      .ag-table-scroll {
        max-height:340px;
        overflow:auto;
      }
      .ag-stats-table {
        width:100%;
        border-collapse:collapse;
      }
      .ag-stats-table th,
      .ag-stats-table td {
        padding:12px 14px;
        text-align:left;
        border-bottom:1px solid rgba(74,74,74,0.06);
        font-size:14px;
        color:#4d485b;
        vertical-align:top;
      }
      .ag-stats-table th {
        position:sticky;
        top:0;
        background:#fff;
        z-index:1;
        font-size:13px;
        color:#7b748c;
      }
      .ag-empty-row {
        text-align:center;
        color:#8b86a0;
        padding:24px 16px !important;
      }
      .ag-student-name-cell {
        font-weight:700;
      }
      .ag-latest-score {
        font-weight:700;
      }
      .ag-latest-meta {
        margin-top:4px;
        color:#8b86a0;
        font-size:12px;
      }
      .ag-record-entry-card {
        min-height:100%;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:14px;
        border:1px solid rgba(74,74,74,0.08);
        border-radius:20px;
        background:#fcfbff;
        padding:22px;
      }
      .ag-record-entry-card h4 {
        margin:0;
        color:#3f3d46;
      }
      .ag-record-entry-card p {
        color:#7f7a92;
        line-height:1.55;
      }
      #ag-record-screen {
        background:radial-gradient(ellipse at 50% 30%, rgba(108,99,255,0.10), transparent 70%), var(--bg);
      }
      .ag-record-shell {
        width:min(1240px, 100%);
        display:flex;
        flex-direction:column;
        gap:18px;
      }
      .ag-record-header {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:16px;
      }
      .ag-record-header h2 {
        margin:0;
        font-size:clamp(28px, 3vw, 40px);
        color:#3f3d46;
      }
      .ag-record-header p {
        margin:8px 0 0;
        color:#7f7a92;
        font-size:15px;
      }
      .ag-record-toolbar {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }
      .ag-record-mode-group {
        display:flex;
        flex-wrap:wrap;
        gap:10px;
      }
      .ag-record-mode-btn,
      .ag-record-list-btn {
        border:1px solid rgba(74,74,74,0.10);
        background:#fff;
        color:#4d485b;
        border-radius:14px;
        padding:11px 14px;
        font:800 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
        text-align:left;
        transition:background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
      }
      .ag-record-mode-btn:hover,
      .ag-record-list-btn:hover {
        transform:translateY(-1px);
      }
      .ag-record-mode-btn.is-active,
      .ag-record-list-btn.is-active {
        border-color:#6c63ff;
        background:#f2f0ff;
        color:#5a4de0;
      }
      .ag-record-main {
        display:grid;
        grid-template-columns:minmax(220px, 280px) minmax(0, 1fr);
        gap:18px;
        align-items:start;
      }
      .ag-record-sidebar,
      .ag-record-detail {
        background:rgba(255,255,255,0.92);
        border:1px solid rgba(74,74,74,0.08);
        border-radius:24px;
        box-shadow:0 18px 40px rgba(91, 88, 116, 0.08);
        padding:22px;
      }
      .ag-record-sidebar h3,
      .ag-record-context h3,
      .ag-record-section-title {
        margin:0;
        color:#3f3d46;
      }
      .ag-record-list {
        display:flex;
        flex-direction:column;
        gap:10px;
        margin-top:14px;
      }
      .ag-record-empty-note {
        border-radius:16px;
        background:#f7f5ff;
        color:#7f7a92;
        padding:14px;
        font-weight:700;
      }
      .ag-record-detail {
        display:flex;
        flex-direction:column;
        gap:18px;
        min-width:0;
      }
      .ag-record-context p {
        margin:6px 0 0;
        color:#7f7a92;
      }
      .ag-record-summary-grid {
        display:grid;
        grid-template-columns:repeat(4, minmax(0, 1fr));
        gap:12px;
      }
      .ag-record-summary-card {
        border-radius:18px;
        background:#fcfbff;
        border:1px solid rgba(74,74,74,0.08);
        padding:14px 16px;
      }
      .ag-record-summary-card span {
        display:block;
        color:#8b86a0;
        font-size:12px;
        font-weight:800;
        margin-bottom:6px;
      }
      .ag-record-summary-card strong {
        color:#3f3d46;
        font-size:20px;
      }
      .ag-record-table-wrap {
        border:1px solid rgba(74,74,74,0.08);
        border-radius:20px;
        overflow:auto;
        background:#fff;
        max-height:46vh;
      }
      .ag-record-table {
        width:100%;
        border-collapse:collapse;
        min-width:720px;
      }
      .ag-record-table th,
      .ag-record-table td {
        border-bottom:1px solid rgba(74,74,74,0.06);
        padding:13px 14px;
        text-align:left;
        color:#4d485b;
        font-size:14px;
      }
      .ag-record-table th {
        position:sticky;
        top:0;
        z-index:1;
        background:#fff;
        color:#7b748c;
        font-size:13px;
      }
      .ag-clickable-cell {
        cursor:pointer;
        color:#5a4de0;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .ag-student-record-grid {
        display:grid;
        grid-template-columns:minmax(0, 1fr);
        gap:16px;
      }
      .ag-tutorial-cell .player-score-line,
      .ag-tutorial-cell .feedback-overlay {
        display:none;
      }
      .ag-tutorial-cell .player-name {
        margin-bottom:8px;
      }
      .ag-tutorial-controls {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
        width:100%;
        margin-top:4px;
      }
      .ag-tutorial-step {
        color:#8b86a0;
        font-size:13px;
        font-weight:700;
      }
      .ag-tutorial-next {
        min-width:96px;
        border:none;
        border-radius:999px;
        padding:10px 18px;
        background:#6c63ff;
        color:#fff;
        font:800 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
        box-shadow:0 12px 24px rgba(108,99,255,0.18);
      }
      .ag-tutorial-next:disabled {
        opacity:0.58;
        cursor:not-allowed;
        box-shadow:none;
      }
      .ag-settings-panel {
        width:min(980px, 100%);
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .ag-settings-top {
        display:grid;
        grid-template-columns:minmax(0, 1.35fr) minmax(220px, 0.78fr) minmax(250px, 0.85fr);
        gap:14px;
      }
      .ag-settings-block {
        border:1px solid rgba(74,74,74,0.08);
        border-radius:20px;
        background:#fcfbff;
        padding:18px;
      }
      .ag-select,
      .ag-number-input {
        width:100%;
        border:1px solid rgba(74,74,74,0.12);
        border-radius:14px;
        padding:12px 14px;
        font:700 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        color:#3f3d46;
        background:#fff;
      }
      .ag-inline-field {
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .ag-count-grid {
        display:grid;
        grid-template-columns:repeat(6, minmax(0, 1fr));
        gap:10px;
      }
      .ag-count-btn {
        border:1px solid rgba(74,74,74,0.12);
        border-radius:16px;
        background:#fff;
        color:#3f3d46;
        font:800 22px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        padding:16px 0;
        cursor:pointer;
        transition:transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }
      .ag-count-btn:hover,
      .game-card:hover {
        transform:translateY(-1px);
      }
      .ag-count-btn.is-active {
        border-color:#6c63ff;
        background:#f2f0ff;
        color:#5a4de0;
        box-shadow:0 12px 24px rgba(108,99,255,0.16);
      }
      .ag-start-stack {
        display:flex;
        flex-direction:column;
        gap:10px;
        height:100%;
        justify-content:center;
      }
      .ag-sidebar-trigger {
        min-height:56px;
        font-size:16px;
      }
      .ag-sidebar-trigger.is-active {
        background:#efeefe;
        color:#5546df;
        box-shadow:0 12px 24px rgba(108,99,255,0.18);
      }
      body.ag-sidebar-open {
        overflow:hidden;
      }
      .ag-sidebar-summary {
        color:#726d84;
        font-size:14px;
        line-height:1.55;
      }
      .ag-secondary-btn.is-active {
        background:#e8fff0;
        color:#176b33;
        box-shadow:0 10px 20px rgba(32, 160, 80, 0.14);
      }
      .ag-settings-hint {
        color:#726d84;
        font-size:14px;
        line-height:1.5;
      }
      .ag-sidebar-backdrop {
        position:fixed;
        inset:0;
        background:rgba(31, 27, 52, 0.18);
        backdrop-filter:blur(4px);
        opacity:0;
        pointer-events:none;
        transition:opacity 0.22s ease;
        z-index:40;
      }
      .ag-sidebar-backdrop.is-open {
        opacity:1;
        pointer-events:auto;
      }
      .ag-student-sidebar {
        position:fixed;
        top:0;
        right:0;
        width:min(430px, calc(100vw - 20px));
        height:100vh;
        display:flex;
        flex-direction:column;
        gap:16px;
        padding:24px 22px;
        background:rgba(255,255,255,0.97);
        border-left:1px solid rgba(74,74,74,0.08);
        box-shadow:-24px 0 48px rgba(70, 63, 98, 0.16);
        transform:translateX(100%);
        transition:transform 0.24s ease;
        z-index:41;
      }
      .ag-student-sidebar.is-open {
        transform:translateX(0);
      }
      .ag-sidebar-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
      }
      .ag-sidebar-head h3 {
        margin:0;
        color:#3f3d46;
      }
      .ag-sidebar-head p {
        margin-top:6px;
        color:#7f7a92;
        font-size:14px;
        line-height:1.5;
      }
      .ag-sidebar-close {
        flex:0 0 auto;
        border:none;
        border-radius:999px;
        padding:9px 14px;
        background:#f3f0ff;
        color:#5546df;
        font:800 13px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
      }
      .ag-sidebar-scroll {
        display:flex;
        flex-direction:column;
        gap:14px;
        min-height:0;
        overflow:auto;
        padding-right:4px;
      }
      .ag-sidebar-section {
        border:1px solid rgba(74,74,74,0.08);
        border-radius:20px;
        background:#fcfbff;
        padding:18px;
      }
      .ag-sidebar-section h4 {
        margin:0 0 12px;
      }
      .ag-sidebar-actions {
        display:grid;
        grid-template-columns:repeat(2, minmax(0, 1fr));
        gap:10px;
      }
      .ag-sidebar-field-group {
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .ag-sidebar-button-stack {
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .ag-rotation-panel {
        width:100%;
        display:flex;
        flex-direction:column;
        gap:14px;
      }
      .ag-student-sidebar .ag-rotation-panel {
        background:transparent;
        border:none;
        box-shadow:none;
        padding:0;
      }
      .ag-rotation-head {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:16px;
      }
      .ag-rotation-head h3 {
        margin:0;
        color:#3f3d46;
      }
      .ag-rotation-head p {
        margin-top:6px;
        color:#7f7a92;
        font-size:14px;
      }
      .ag-rotation-legend {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }
      .ag-legend {
        display:inline-flex;
        align-items:center;
        gap:6px;
        color:#625d70;
        font-size:12px;
        font-weight:800;
      }
      .ag-legend::before {
        content:'';
        width:10px;
        height:10px;
        border-radius:999px;
        background:#ccd3df;
      }
      .ag-legend-next::before { background:#6c63ff; }
      .ag-legend-pending::before { background:#28a745; }
      .ag-legend-done::before { background:#a9adb8; }
      .ag-next-list {
        min-height:46px;
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
        border:1px dashed rgba(108,99,255,0.32);
        border-radius:18px;
        background:#faf9ff;
        padding:10px;
      }
      .ag-next-chip,
      .ag-next-empty {
        border:none;
        border-radius:999px;
        padding:9px 12px;
        font:800 13px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
      }
      .ag-next-chip {
        background:#6c63ff;
        color:#fff;
        cursor:pointer;
      }
      .ag-next-empty {
        color:#8b86a0;
      }
      .ag-rotation-list {
        display:grid;
        grid-template-columns:1fr;
        gap:10px;
      }
      .ag-rotation-student {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        min-height:52px;
        border:1px solid rgba(74,74,74,0.10);
        border-radius:16px;
        background:#fff;
        padding:12px 14px;
        font:800 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
        transition:transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }
      .ag-rotation-student:hover {
        transform:translateY(-1px);
      }
      .ag-rotation-student.is-next {
        border-color:#6c63ff;
        background:#f2f0ff;
        color:#4f46d8;
        box-shadow:0 12px 24px rgba(108,99,255,0.14);
      }
      .ag-rotation-student.is-pending {
        border-color:rgba(40,167,69,0.24);
        background:#f1fff5;
        color:#176b33;
      }
      .ag-rotation-student.is-done {
        border-color:rgba(74,74,74,0.08);
        background:#f2f3f5;
        color:#777b85;
      }
      .ag-rotation-state {
        flex:0 0 auto;
        border-radius:999px;
        padding:5px 8px;
        background:rgba(255,255,255,0.72);
        font-size:12px;
      }
      .game-cards {
        display:grid;
        grid-template-columns:repeat(2,minmax(280px,1fr));
        gap:20px;
        width:min(980px,92vw);
      }
      .game-card {
        width:auto;
        min-height:220px;
        cursor:pointer;
        transition:transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      }
      .game-card.ag-selected-card {
        border-color:#6c63ff;
        background:linear-gradient(180deg, rgba(108,99,255,0.12), rgba(255,255,255,0.96));
        box-shadow:0 18px 36px rgba(108,99,255,0.14);
      }
      .ag-card-option {
        margin:14px auto 0;
        display:inline-flex;
        align-items:center;
        gap:8px;
        border:1px solid rgba(108,99,255,0.16);
        border-radius:999px;
        padding:9px 12px;
        background:#f8f7ff;
        color:#5d566d;
        font:800 13px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
      }
      .ag-card-option input {
        width:16px;
        height:16px;
        accent-color:#6c63ff;
      }
      .game-topbar {
        height:auto !important;
        min-height:104px;
        display:grid;
        grid-template-columns:auto auto minmax(0, 1fr) auto;
        gap:18px;
        align-items:center;
        justify-content:stretch;
        padding:14px 22px 16px;
      }
      .game-topbar .back-btn-inline {
        position:static;
        top:auto;
        left:auto;
        transform:none;
        align-self:center;
        justify-self:start;
      }
      .ag-fullscreen-btn {
        border:1px solid rgba(0,0,0,0.08);
        border-radius:10px;
        padding:10px 14px;
        background:#f8f9fa;
        color:#3f3d46;
        font:700 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
        justify-self:start;
      }
      .ag-fullscreen-btn:hover {
        background:rgba(108,99,255,0.12);
        border-color:rgba(108,99,255,0.28);
      }
      .ag-home-float {
        position:fixed;
        right:18px;
        bottom:18px;
        z-index:80;
        display:inline-flex;
        align-items:center;
        gap:8px;
        border:1px solid rgba(108,99,255,0.18);
        border-radius:999px;
        padding:12px 16px;
        background:rgba(255,255,255,0.94);
        color:#4f46d8;
        box-shadow:0 14px 34px rgba(53,49,92,0.18);
        font:800 14px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        text-decoration:none;
      }
      .ag-home-float:hover {
        background:#f6f4ff;
        border-color:rgba(108,99,255,0.34);
      }
      .ag-measure-status {
        min-height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid rgba(108,99,255,0.14);
        border-radius:999px;
        padding:7px 12px;
        margin:-4px auto 2px;
        background:rgba(255,255,255,0.82);
        color:#5d566d;
        font:800 clamp(12px,1.2vw,15px) 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        text-align:center;
        max-width:min(92%, 430px);
      }
      .ag-measure-status.ready {
        color:#1d7d35;
        background:rgba(233, 255, 237, 0.92);
        border-color:rgba(50, 177, 83, 0.24);
      }
      .ag-topbar-meta {
        position:static;
        transform:none;
        display:flex;
        flex-direction:column;
        align-items:center;
        text-align:center;
        gap:6px;
        pointer-events:none;
      }
      .ag-topbar-title {
        font-size:clamp(20px,2.2vw,28px);
        font-weight:800;
        letter-spacing:-0.04em;
        color:#3f3d46;
      }
      .ag-topbar-caption {
        font-size:13px;
        color:#8b8b8b;
      }
      .ag-topbar-controls {
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        gap:8px;
        justify-self:end;
      }
      .ag-timer-meta {
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        gap:2px;
      }
      .ag-timer-label {
        font-size:12px;
        color:#8b86a0;
        font-weight:700;
        letter-spacing:0.06em;
      }
      .game-topbar span.timer-display {
        margin:0;
        color:#ff6b6b;
        font-size:clamp(34px,4vw,56px);
        line-height:1;
      }
      .ag-finish-btn {
        border:none;
        border-radius:999px;
        padding:9px 14px;
        background:#fff1cf;
        color:#7f5b00;
        font:700 13px 'Outfit', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Segoe UI', sans-serif;
        cursor:pointer;
      }
      .player-name {
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:6px;
        margin-bottom:18px;
      }
      .ag-player-main {
        font-size:clamp(24px, 2vw, 32px);
        font-weight:800;
        color:#333;
      }
      .ag-player-sub {
        font-size:14px;
        color:#8b86a0;
        font-weight:700;
      }
      .rank-name {
        display:flex;
        flex-direction:column;
        gap:4px;
      }
      .ag-rank-main {
        font-size:22px;
        font-weight:700;
      }
      .ag-rank-sub {
        font-size:13px;
        color:#8b86a0;
        font-weight:600;
      }
      @media (max-width: 1080px) {
        .ag-player-layout,
        .ag-student-grid,
        .ag-record-main,
        .ag-settings-top {
          grid-template-columns:1fr;
        }
        .ag-record-summary-grid {
          grid-template-columns:repeat(2, minmax(0, 1fr));
        }
        .ag-count-grid {
          grid-template-columns:repeat(3, minmax(0, 1fr));
        }
        .ag-sidebar-actions {
          grid-template-columns:1fr;
        }
        .ag-student-sidebar {
          width:min(430px, calc(100vw - 12px));
        }
      }
      @media (max-width: 900px) {
        .game-cards {
          grid-template-columns:1fr;
        }
        .game-topbar {
          grid-template-columns:1fr;
          justify-items:center;
        }
        .ag-topbar-controls {
          align-items:center;
        }
        .ag-count-grid {
          grid-template-columns:repeat(2, minmax(0, 1fr));
        }
        .ag-record-header,
        .ag-record-toolbar {
          flex-direction:column;
          align-items:stretch;
        }
        .ag-record-summary-grid {
          grid-template-columns:1fr;
        }
        .ag-student-sidebar {
          width:100vw;
          max-width:100vw;
          padding:22px 16px;
        }
        .ag-rotation-head {
          flex-direction:column;
        }
        .ag-home-float {
          right:10px;
          bottom:10px;
          padding:10px 12px;
          font-size:12px;
        }
      }
    `;
    document.head.appendChild(style);

    ensureHomeFloatingButton();

    const home = document.getElementById('home-screen');
    if (home) {
      const title = home.querySelector('.home-title');
      const subtitle = home.querySelector('.home-subtitle');
      const button = home.querySelector('button');
      if (title) title.textContent = '앵글맨';
      if (subtitle) subtitle.innerHTML = '각도 만들기부터 실전 각도재기까지<br>전자칠판에서 바로 즐기는 각도 게임';
      if (button) {
        button.textContent = '시작하기';
        button.onclick = () => showScreen('game-select-screen');
      }
    }

    const playerScreen = document.getElementById('player-screen');
    if (playerScreen) {
      const back = playerScreen.querySelector('.back-btn');
      const title = playerScreen.querySelector('.section-title');
      if (back) {
        back.textContent = '게임 선택';
        back.onclick = () => showScreen('game-select-screen');
      }
      if (title) title.textContent = '학생 명단 관리';
      if (!playerScreen.querySelector('.ag-player-layout')) {
        const grid = playerScreen.querySelector('#player-grid');
        const preview = playerScreen.querySelector('#animals-preview');
        const layout = document.createElement('div');
        layout.className = 'ag-player-layout';
        layout.innerHTML = `
          <section class="ag-panel ag-player-card" id="ag-player-card">
            <div class="ag-inline-field">
              <div class="ag-player-title-slot"></div>
              <span class="ag-chip ag-roster-chip" id="ag-roster-player-count">현재 참가 인원을 아직 고르지 않았습니다.</span>
              <p class="ag-card-copy" id="ag-roster-card-copy">학생 이름 없이도 그대로 플레이할 수 있습니다. 명단을 저장하면 게임 선택 화면에서 번호순 또는 랜덤 배정을 바로 쓸 수 있습니다.</p>
            </div>
          </section>
          <section class="ag-panel ag-student-card">
            <div class="ag-panel-head">
              <div>
                <h3>학생 명단</h3>
                <p id="ag-roster-summary">학생 이름 없이도 기존 동물 이름으로 바로 플레이할 수 있습니다.</p>
              </div>
              <span class="ag-file-badge" id="ag-student-file-badge">파일 연결 없음</span>
            </div>
            <div class="ag-student-grid">
              <div>
                <label class="ag-field-label" for="ag-student-names">한 줄에 한 명씩 입력</label>
                <textarea class="ag-textarea" id="ag-student-names" placeholder="김민수&#10;박서연&#10;이준호"></textarea>
                <div class="ag-actions">
                  <button type="button" class="ag-primary-btn" id="ag-save-students">명단 저장</button>
                  <button type="button" class="ag-secondary-btn" id="ag-save-students-file">파일 저장</button>
                  <button type="button" class="ag-secondary-btn" id="ag-load-students-file">파일 불러오기</button>
                </div>
                <p class="ag-helper">브라우저에는 자동 저장되고, 파일 저장을 누르면 원하는 로컬 경로에 JSON으로 기록됩니다.</p>
                <div class="ag-status" id="ag-student-status">학생 이름이 없어도 동물 이름으로 바로 플레이할 수 있습니다.</div>
                <input type="file" id="ag-student-file-input" accept=".json,.txt,application/json,text/plain" hidden>
              </div>
              <div class="ag-record-entry-card">
                <h4>학생 기록</h4>
                <p>게임별 전체 기록과 학생별 상세 기록은 별도 화면에서 크게 확인합니다.</p>
                <div class="ag-status" id="ag-roster-record-summary">아직 저장된 게임 기록은 없습니다.</div>
                <button type="button" class="ag-primary-btn" id="ag-open-records-from-roster">학생 기록 보기</button>
              </div>
            </div>
          </section>
        `;

        const leftPanel = layout.querySelector('#ag-player-card');
        const titleSlot = leftPanel.querySelector('.ag-player-title-slot');
        if (title && titleSlot) titleSlot.appendChild(title);
        if (grid) {
          grid.hidden = true;
          leftPanel.appendChild(grid);
        }
        if (preview) {
          preview.classList.add('ag-roster-preview');
          leftPanel.appendChild(preview);
        }

        playerScreen.appendChild(layout);
        if (back) playerScreen.insertBefore(back, layout);
      }
    }

    const gameSelect = document.getElementById('game-select-screen');
    if (gameSelect) {
      const back = gameSelect.querySelector('.back-btn');
      const title = gameSelect.querySelector('.section-title');
      if (back) {
        back.textContent = '뒤로';
        back.onclick = () => {
          setStudentSidebarOpen(false);
          showScreen('home-screen');
        };
      }
      if (title) title.textContent = '게임과 참가 인원을 선택하세요';
      const previewBar = document.getElementById('animals-bar-game');
      if (previewBar) previewBar.classList.add('ag-roster-preview');
      const cards = gameSelect.querySelector('.game-cards');
      if (!document.getElementById('ag-game-settings')) {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'ag-panel ag-settings-panel';
        settingsPanel.id = 'ag-game-settings';
        settingsPanel.innerHTML = `
          <div class="ag-settings-top">
            <div class="ag-settings-block ag-inline-field">
              <label class="ag-field-label">참가 인원</label>
              <div class="ag-count-grid" id="ag-player-count-grid">
                ${Array.from({ length: 6 }, (_, index) => (
                  `<button type="button" class="ag-count-btn" data-count="${index + 1}">${index + 1}</button>`
                )).join('')}
              </div>
              <p class="ag-helper" id="ag-player-count-hint">참가 인원을 먼저 고르면 그 인원 수로 게임이 바로 시작됩니다.</p>
            </div>
            <div class="ag-settings-block ag-inline-field">
              <label class="ag-field-label" for="ag-timer-preset">타이머</label>
              <select class="ag-select" id="ag-timer-preset">
                ${Object.entries(TIMER_OPTIONS).map(([value, option]) => `<option value="${value}">${option.label}</option>`).join('')}
              </select>
              <input class="ag-number-input" id="ag-custom-timer" type="number" min="5" max="3600" step="5" placeholder="초 단위로 입력">
            </div>
            <div class="ag-settings-block ag-start-stack">
              <div>
                <label class="ag-field-label">학생 관리</label>
                <span class="ag-file-badge" id="ag-sidebar-badge">명단 없음</span>
              </div>
              <p class="ag-sidebar-summary" id="ag-sidebar-summary">학생 이름 없이도 바로 플레이할 수 있습니다.</p>
              <button type="button" class="ag-primary-btn ag-sidebar-trigger" id="ag-toggle-sidebar" aria-expanded="false">학생 관리 열기</button>
            </div>
          </div>
        `;
        if (cards) gameSelect.insertBefore(settingsPanel, cards);
      }
      if (!document.getElementById('ag-student-sidebar')) {
        const backdrop = document.createElement('div');
        backdrop.className = 'ag-sidebar-backdrop';
        backdrop.id = 'ag-sidebar-backdrop';
        gameSelect.appendChild(backdrop);

        const sidebar = document.createElement('aside');
        sidebar.className = 'ag-student-sidebar';
        sidebar.id = 'ag-student-sidebar';
        sidebar.innerHTML = `
          <div class="ag-sidebar-head">
            <div>
              <h3>학생 관리</h3>
              <p id="ag-sidebar-copy">명단을 저장하면 번호순, 랜덤 지정과 참여 순환을 여기서 바로 관리할 수 있습니다.</p>
            </div>
            <button type="button" class="ag-sidebar-close" id="ag-close-sidebar">닫기</button>
          </div>
          <div class="ag-sidebar-scroll">
            <section class="ag-sidebar-section">
              <div class="ag-sidebar-actions">
                <button type="button" class="ag-secondary-btn" id="ag-open-roster">학생 명단 관리</button>
                <button type="button" class="ag-secondary-btn" id="ag-open-records">학생 기록 보기</button>
              </div>
            </section>
            <section class="ag-sidebar-section ag-sidebar-field-group">
              <label class="ag-field-label" for="ag-assignment-mode">학생 지정 방식</label>
              <select class="ag-select" id="ag-assignment-mode">
                ${Object.entries(ASSIGNMENT_OPTIONS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
              </select>
              <p class="ag-settings-hint" id="ag-assigned-hint"></p>
            </section>
            <section class="ag-sidebar-section">
              <h4>참가자 재배정</h4>
              <div class="ag-sidebar-button-stack">
                <button type="button" class="ag-secondary-btn" id="ag-reroll-students">다음 미참여자 자동 배정</button>
                <button type="button" class="ag-secondary-btn" id="ag-clear-next-students">다음 명단 비우기</button>
                <button type="button" class="ag-secondary-btn" id="ag-repeat-selected">선택 명단 반복 꺼짐</button>
                <button type="button" class="ag-secondary-btn" id="ag-reset-rotation">참여 상태 초기화</button>
              </div>
            </section>
            <section class="ag-sidebar-section ag-rotation-panel" id="ag-rotation-panel">
              <div class="ag-rotation-head">
                <div>
                  <h3>학생 참여 순환</h3>
                  <p id="ag-rotation-summary">아직 학생 명단이 없습니다.</p>
                </div>
                <div class="ag-rotation-legend" aria-label="학생 참여 상태 범례">
                  <span class="ag-legend ag-legend-next">다음 게임</span>
                  <span class="ag-legend ag-legend-pending">아직 안 함</span>
                  <span class="ag-legend ag-legend-done">이미 함</span>
                </div>
              </div>
              <div class="ag-next-list" id="ag-next-students"></div>
              <div class="ag-rotation-list" id="ag-rotation-list"></div>
            </section>
          </div>
        `;
        gameSelect.appendChild(sidebar);
      }
      if (cards) {
        cards.innerHTML = '';
        Object.entries(GAME_META).forEach(([key, meta]) => {
          const card = document.createElement('div');
          card.className = 'game-card';
          card.dataset.game = key;
          card.tabIndex = 0;
          const pickGame = () => {
            selectedGame = normalizeGameNumber(key);
            renderSelectionUi();
            window.startGame(selectedGame);
          };
          card.onclick = pickGame;
          card.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              pickGame();
            }
          };
          card.innerHTML = `
            <div class="emoji">${meta.emoji}</div>
            <h3>${meta.title}</h3>
            <p>${meta.description}</p>
            ${Number(key) === 4 ? `
              <label class="ag-card-option" onclick="event.stopPropagation()">
                <input id="ag-measure-number-visible" type="checkbox" ${measureNumberVisible ? 'checked' : ''}>
                눈금 숫자 자동 표시
              </label>
            ` : ''}
          `;
          cards.appendChild(card);
        });
        document.getElementById('ag-measure-number-visible')?.addEventListener('change', (event) => {
          event.stopPropagation();
          measureNumberVisible = event.target.checked;
          saveMeasureNumberVisible();
          if (currentGame === 4 && gameActive) {
            playerData.forEach((data, idx) => {
              if (data?.mode === 'measure') window.redrawShape?.(idx);
            });
          }
        });
      }
    }

    let recordScreen = document.getElementById('ag-record-screen');
    if (!recordScreen) {
      recordScreen = document.createElement('div');
      recordScreen.id = 'ag-record-screen';
      recordScreen.className = 'screen';
      recordScreen.innerHTML = `
        <button class="back-btn" id="ag-record-back" type="button">게임 선택</button>
        <div class="ag-record-shell">
          <section class="ag-panel">
            <div class="ag-record-header">
              <div>
                <h2>학생 기록</h2>
                <p>게임별 전체 기록을 비교하거나, 학생 한 명의 모든 게임 기록을 표로 확인합니다.</p>
              </div>
              <span class="ag-file-badge" id="ag-record-count-badge">누적 기록 0개</span>
            </div>
            <div class="ag-record-toolbar">
              <div class="ag-record-mode-group">
                <button type="button" class="ag-record-mode-btn" data-record-mode="game">게임별 전체 보기</button>
                <button type="button" class="ag-record-mode-btn" data-record-mode="student">학생별 상세 보기</button>
              </div>
              <button type="button" class="ag-secondary-btn" id="ag-record-open-roster">학생 명단 관리</button>
            </div>
          </section>
          <div class="ag-record-main">
            <aside class="ag-record-sidebar">
              <h3 id="ag-record-side-title">게임 선택</h3>
              <div class="ag-record-list" id="ag-record-game-tabs"></div>
              <div class="ag-record-list" id="ag-record-student-list" hidden></div>
            </aside>
            <section class="ag-record-detail">
              <div class="ag-record-context">
                <h3 id="ag-record-context-title">게임별 전체 기록</h3>
                <p id="ag-record-context-copy">선택한 게임 기준으로 등록된 모든 학생의 기록을 한 번에 비교합니다.</p>
              </div>
              <div class="ag-record-summary-grid" id="ag-record-summary-cards"></div>
              <div id="ag-record-game-view">
                <div class="ag-record-table-wrap">
                  <table class="ag-record-table">
                    <thead>
                      <tr>
                        <th>번호</th>
                        <th>학생</th>
                        <th>기록 수</th>
                        <th>1회 평균</th>
                        <th>최근 5회 평균</th>
                        <th>최고점</th>
                        <th>최신 기록</th>
                      </tr>
                    </thead>
                    <tbody id="ag-game-record-body"></tbody>
                  </table>
                </div>
              </div>
              <div id="ag-record-student-view" class="ag-student-record-grid" hidden>
                <div>
                  <h4 class="ag-record-section-title">게임별 요약</h4>
                  <div class="ag-record-table-wrap">
                    <table class="ag-record-table">
                      <thead>
                        <tr>
                          <th>게임</th>
                          <th>기록 수</th>
                          <th>1회 평균</th>
                          <th>최근 5회 평균</th>
                          <th>최고점</th>
                          <th>최신 기록</th>
                        </tr>
                      </thead>
                      <tbody id="ag-student-game-record-body"></tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 class="ag-record-section-title">전체 기록표</h4>
                  <div class="ag-record-table-wrap">
                    <table class="ag-record-table">
                      <thead>
                        <tr>
                          <th>날짜</th>
                          <th>게임</th>
                          <th>점수</th>
                          <th>타이머</th>
                        </tr>
                      </thead>
                      <tbody id="ag-student-record-log-body"></tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      `;
      document.body.appendChild(recordScreen);
    }

    const topbar = document.querySelector('.game-topbar');
    if (topbar) {
      let fullscreenButton = document.getElementById('ag-fullscreen-game') || document.querySelector('.fullscreen-btn-inline');
      if (!fullscreenButton) {
        fullscreenButton = document.createElement('button');
        fullscreenButton.type = 'button';
        fullscreenButton.addEventListener('click', () => window.toggleFullscreen?.());
      }
      fullscreenButton.className = 'ag-fullscreen-btn';
      fullscreenButton.id = 'ag-fullscreen-game';
      fullscreenButton.textContent = '전체화면';
      const gameBack = document.querySelector('.back-btn-inline');
      if (gameBack) gameBack.insertAdjacentElement('afterend', fullscreenButton);

      let metaWrap = document.getElementById('ag-topbar-meta');
      if (!metaWrap) {
        metaWrap = document.createElement('div');
        metaWrap.className = 'ag-topbar-meta';
        metaWrap.id = 'ag-topbar-meta';
        metaWrap.innerHTML = `
          <div class="ag-topbar-title" id="ag-topbar-title">각도 만들기</div>
          <div class="ag-topbar-caption" id="ag-topbar-caption">문제를 많이 맞혀 점수를 쌓아 보세요.</div>
        `;
      }
      topbar.appendChild(metaWrap);

      let controls = document.getElementById('ag-topbar-controls');
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'ag-topbar-controls';
        controls.id = 'ag-topbar-controls';
        controls.innerHTML = `
          <div class="ag-timer-meta">
            <div class="ag-timer-label">TIMER</div>
          </div>
          <button type="button" class="ag-finish-btn" id="ag-finish-game">결과 보기</button>
        `;
      }
      const timer = document.getElementById('time-left');
      const timerMeta = controls.querySelector('.ag-timer-meta');
      if (timerMeta && timer) timerMeta.appendChild(timer);
      topbar.appendChild(controls);
    }

    const gameBack = document.querySelector('.back-btn-inline');
    if (gameBack) gameBack.textContent = '게임 나가기';

    const resultScreen = document.getElementById('result-screen');
    if (resultScreen) {
      const title = resultScreen.querySelector('.result-title');
      const buttons = resultScreen.querySelectorAll('.result-btn');
      if (title) title.textContent = '최종 결과';
      if (buttons[0]) buttons[0].textContent = '처음으로';
      if (buttons[1]) buttons[1].textContent = '같은 게임 다시하기';
    }

    syncStudentTextarea();
    if (!Number.isInteger(playerCount) || playerCount < 1) {
      playerCount = DEFAULT_PLAYER_COUNT;
      refreshStudentAssignments({ advance: true });
    } else {
      renderStudentUi();
    }

    document.querySelectorAll('.ag-count-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const count = Number.parseInt(button.dataset.count, 10);
        if (!Number.isFinite(count)) return;
        window.selectPlayers(count);
      });
    });
    document.getElementById('ag-toggle-sidebar')?.addEventListener('click', () => {
      setStudentSidebarOpen(!studentSidebarOpen);
    });
    document.getElementById('ag-close-sidebar')?.addEventListener('click', () => {
      setStudentSidebarOpen(false);
    });
    document.getElementById('ag-sidebar-backdrop')?.addEventListener('click', () => {
      setStudentSidebarOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && studentSidebarOpen) {
        setStudentSidebarOpen(false);
      }
    });
    document.getElementById('ag-open-roster')?.addEventListener('click', () => {
      setStudentSidebarOpen(false);
      showScreen('player-screen');
    });
    document.getElementById('ag-open-records')?.addEventListener('click', () => {
      setStudentSidebarOpen(false);
      openRecordScreen('game');
    });
    document.getElementById('ag-open-records-from-roster')?.addEventListener('click', () => {
      openRecordScreen('game');
    });
    document.getElementById('ag-record-back')?.addEventListener('click', () => {
      showScreen('game-select-screen');
    });
    document.getElementById('ag-record-open-roster')?.addEventListener('click', () => {
      showScreen('player-screen');
    });
    document.querySelectorAll('[data-record-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        recordViewMode = button.dataset.recordMode === 'student' ? 'student' : 'game';
        renderRecordUi();
      });
    });
    document.getElementById('ag-save-students')?.addEventListener('click', saveRosterFromTextarea);
    document.getElementById('ag-save-students-file')?.addEventListener('click', () => {
      void saveStudentsToFile({ forcePicker: !studentFileHandle });
    });
    document.getElementById('ag-load-students-file')?.addEventListener('click', () => {
      document.getElementById('ag-student-file-input')?.click();
    });
    document.getElementById('ag-student-file-input')?.addEventListener('change', (event) => {
      const file = event.target?.files?.[0];
      if (file) void importStudentsFromFile(file);
      event.target.value = '';
    });
    document.getElementById('ag-assignment-mode')?.addEventListener('change', (event) => {
      studentState.assignmentMode = normalizeAssignmentMode(event.target.value);
      studentState.activeStudentIds = [];
      saveStudentState();
      refreshStudentAssignments({ advance: true });
    });
    document.getElementById('ag-reroll-students')?.addEventListener('click', () => {
      assignNextUnplayedStudents({ resetIfComplete: true });
    });
    document.getElementById('ag-clear-next-students')?.addEventListener('click', () => {
      setActiveStudentIds([]);
    });
    document.getElementById('ag-repeat-selected')?.addEventListener('click', () => {
      studentState.repeatSelectedStudents = !studentState.repeatSelectedStudents;
      saveStudentState();
      renderStudentUi();
    });
    document.getElementById('ag-reset-rotation')?.addEventListener('click', () => {
      resetParticipationCycle();
    });
    document.getElementById('ag-timer-preset')?.addEventListener('change', (event) => {
      studentState.timerPreset = normalizeTimerPreset(event.target.value);
      saveStudentState();
      updateTimerControls();
      renderTopbar();
    });
    document.getElementById('ag-custom-timer')?.addEventListener('change', (event) => {
      studentState.customTimerSeconds = normalizeCustomTimerSeconds(event.target.value);
      saveStudentState();
      updateTimerControls();
      renderTopbar();
    });
    document.getElementById('ag-finish-game')?.addEventListener('click', () => {
      if (!gameActive) return;
      window.timeUp();
    });
  }

  function ensureHomeFloatingButton() {
    if (document.getElementById('ag-home-float')) return;
    const link = document.createElement('a');
    link.id = 'ag-home-float';
    link.className = 'ag-home-float';
    link.href = 'https://hanssam622.github.io/ssamnori/';
    link.textContent = '쌤노리 홈';
    link.setAttribute('aria-label', '쌤노리 홈화면으로 가기');
    document.body.appendChild(link);
  }

  function renderTopbar() {
    const meta = GAME_META[currentGame] || GAME_META[1];
    const title = document.getElementById('ag-topbar-title');
    const caption = document.getElementById('ag-topbar-caption');
    if (title) title.textContent = `${meta.emoji} ${meta.title}`;
    if (caption) {
      caption.textContent = studentState.timerPreset === 'none'
        ? `${meta.description} · 시간 제한 없음`
        : `${meta.description} · ${getConfiguredTimerLabel()} 제한`;
    }
  }

  function cancelMeasureAnimation(idx) {
    const data = playerData[idx];
    if (!data || !isMeasureMode(data)) return;
    if (data.overlay?.frameId) {
      cancelAnimationFrame(data.overlay.frameId);
      data.overlay.frameId = null;
      data.overlay.animating = false;
    }
    if (data.guide?.frameId) {
      cancelAnimationFrame(data.guide.frameId);
      data.guide.frameId = null;
      data.guide.running = false;
    }
  }

  function cancelAllAnimations() {
    playerData.forEach((_, idx) => cancelMeasureAnimation(idx));
  }

  function buildCell(idx) {
    const mainLabel = escapeHtml(getPlayerLabel(idx));
    const subLabel = escapeHtml(getPlayerSubLabel(idx));
    return `
      <div class="player-header">
        <div class="player-name">
          <span class="ag-player-main">${mainLabel}</span>
          ${subLabel ? `<span class="ag-player-sub">${subLabel}</span>` : ''}
        </div>
        <div class="player-score-line">점수 <span id="score-${idx}">${scores[idx]}</span></div>
        <div class="player-score-line" style="margin-top:-8px;">연속 <span id="combo-${idx}">${streaks[idx]}</span></div>
      </div>
      <div class="cell-body" id="body-${idx}"></div>
      <div class="feedback-overlay" id="feedback-${idx}"></div>
    `;
  }

  function updateScoreboard(idx) {
    const scoreEl = document.getElementById(`score-${idx}`);
    const comboEl = document.getElementById(`combo-${idx}`);
    if (scoreEl) scoreEl.textContent = String(scores[idx]);
    if (comboEl) comboEl.textContent = String(streaks[idx]);
  }

  function prompt(text) {
    const label = document.createElement('div');
    label.className = 'target-angle';
    label.textContent = text;
    return label;
  }

  function createNumpad(idx) {
    const wrap = document.createElement('div');
    wrap.className = 'numpad-area';
    const display = document.createElement('div');
    display.className = 'numpad-display';
    display.id = `numdisp-${idx}`;
    wrap.appendChild(display);

    const makeRow = (numbers) => {
      const row = document.createElement('div');
      row.className = 'numpad-row';
      numbers.forEach((num) => {
        const btn = document.createElement('button');
        btn.className = 'numpad-btn';
        btn.textContent = String(num);
        btn.onclick = () => window.numpadInput(idx, String(num));
        row.appendChild(btn);
      });
      return row;
    };

    wrap.appendChild(makeRow([1, 2, 3, 4, 5]));
    wrap.appendChild(makeRow([6, 7, 8, 9, 0]));
    const actionRow = document.createElement('div');
    actionRow.className = 'numpad-row';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'numpad-btn delete';
    deleteBtn.textContent = '←';
    deleteBtn.onclick = () => window.numpadDelete(idx);
    actionRow.appendChild(deleteBtn);
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'numpad-btn confirm';
    confirmBtn.textContent = '확인';
    confirmBtn.onclick = () => window.numpadConfirm(idx);
    actionRow.appendChild(confirmBtn);
    wrap.appendChild(actionRow);
    return wrap;
  }
  function fitVertices(rawVertices, width, height, options = {}) {
    const {
      paddingLeft = 24,
      paddingRight = 24,
      paddingTop = 24,
      paddingBottom = 24,
      targetVertexIndex = null,
      targetVertexPos = null
    } = options;

    const screenRaw = rawVertices.map(([x, y]) => [x, -y]);
    const xs = screenRaw.map((point) => point[0]);
    const ys = screenRaw.map((point) => point[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rawWidth = Math.max(0.001, maxX - minX);
    const rawHeight = Math.max(0.001, maxY - minY);
    const scale = Math.min(
      (width - paddingLeft - paddingRight) / rawWidth,
      (height - paddingTop - paddingBottom) / rawHeight
    );

    let tx = (width - (minX + maxX) * scale) / 2;
    let ty = (height - (minY + maxY) * scale) / 2;

    if (targetVertexIndex !== null && targetVertexPos) {
      const targetVertex = screenRaw[targetVertexIndex];
      tx = targetVertexPos[0] - targetVertex[0] * scale;
      ty = targetVertexPos[1] - targetVertex[1] * scale;
      const fitted = screenRaw.map(([x, y]) => [x * scale + tx, y * scale + ty]);
      const fittedXs = fitted.map((point) => point[0]);
      const fittedYs = fitted.map((point) => point[1]);
      const minFitX = Math.min(...fittedXs);
      const maxFitX = Math.max(...fittedXs);
      const minFitY = Math.min(...fittedYs);
      const maxFitY = Math.max(...fittedYs);
      if (minFitX < paddingLeft) tx += paddingLeft - minFitX;
      else if (maxFitX > width - paddingRight) tx += (width - paddingRight) - maxFitX;
      if (minFitY < paddingTop) ty += paddingTop - minFitY;
      else if (maxFitY > height - paddingBottom) ty += (height - paddingBottom) - maxFitY;
    }

    return screenRaw.map(([x, y]) => [x * scale + tx, y * scale + ty]);
  }

  function isConvex(vertices) {
    let sign = 0;
    for (let i = 0; i < vertices.length; i += 1) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      const c = vertices[(i + 2) % vertices.length];
      const cross = ((b[0] - a[0]) * (c[1] - b[1])) - ((b[1] - a[1]) * (c[0] - b[0]));
      if (Math.abs(cross) < 0.0001) continue;
      if (sign === 0) sign = Math.sign(cross);
      else if (Math.sign(cross) !== sign) return false;
    }
    return true;
  }

  function createTriangleModel() {
    while (true) {
      const a = randAngle5(25, 130);
      const b = randAngle5(25, 155 - a);
      const c = 180 - a - b;
      if (c < 25 || c > 130 || c % 5 !== 0) continue;
      const ratios = [a, b, c].map((angle) => Math.sin(angle * DEG));
      if (Math.max(...ratios) / Math.min(...ratios) > 2.2) continue;
      const sideB = Math.sin(b * DEG) / Math.sin(c * DEG);
      return {
        angles: [a, b, c],
        rawVertices: [
          [0, 0],
          [1, 0],
          [Math.cos(a * DEG) * sideB, Math.sin(a * DEG) * sideB]
        ]
      };
    }
  }

  function createQuadModel() {
    while (true) {
      const a = randAngle5(50, 145);
      const b = randAngle5(50, 145);
      const c = randAngle5(50, 145);
      const d = 360 - a - b - c;
      if (d < 50 || d > 145 || d % 5 !== 0) continue;
      const dirs = [
        0,
        degToRad(180 - b),
        degToRad(180 - b + 180 - c),
        degToRad(180 - b + 180 - c + 180 - d)
      ];
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const l0 = randFloat(1.0, 1.45);
        const l1 = randFloat(0.8, 1.35);
        const rhsX = -(l0 * Math.cos(dirs[0]) + l1 * Math.cos(dirs[1]));
        const rhsY = -(l0 * Math.sin(dirs[0]) + l1 * Math.sin(dirs[1]));
        const det = (Math.cos(dirs[2]) * Math.sin(dirs[3])) - (Math.sin(dirs[2]) * Math.cos(dirs[3]));
        if (Math.abs(det) < 0.15) continue;
        const l2 = ((rhsX * Math.sin(dirs[3])) - (rhsY * Math.cos(dirs[3]))) / det;
        const l3 = ((Math.cos(dirs[2]) * rhsY) - (Math.sin(dirs[2]) * rhsX)) / det;
        if (l2 <= 0.45 || l3 <= 0.45) continue;
        const lengths = [l0, l1, l2, l3];
        if (Math.max(...lengths) / Math.min(...lengths) > 2.1) continue;
        const rawVertices = [[0, 0]];
        for (let i = 0; i < 3; i += 1) {
          const prev = rawVertices[i];
          rawVertices.push([
            prev[0] + Math.cos(dirs[i]) * lengths[i],
            prev[1] + Math.sin(dirs[i]) * lengths[i]
          ]);
        }
        if (!isConvex(rawVertices)) continue;
        return { angles: [a, b, c, d], rawVertices };
      }
    }
  }

  function chooseMeasureBase(vertex, prev, next) {
    const prevAngle = normalizeAngle(Math.atan2(prev[1] - vertex[1], prev[0] - vertex[0]));
    const nextAngle = normalizeAngle(Math.atan2(next[1] - vertex[1], next[0] - vertex[0]));
    const prevDelta = clockwiseDelta(prevAngle, nextAngle);
    if (prevDelta <= Math.PI) return { baseAngle: prevAngle, measuredAngle: Math.round(radToDeg(prevDelta)) };
    return { baseAngle: nextAngle, measuredAngle: Math.round(radToDeg(clockwiseDelta(nextAngle, prevAngle))) };
  }

  function angleDistance(a, b) {
    return Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  }

  function getMeasureStatusText(data) {
    if (!isMeasureMode(data) || data.mode === 'measure-tutorial') return '';
    if (data.measureStage === 'place') return '1. 각도기 중심점을 표시된 꼭짓점에 드래그하세요';
    if (data.measureStage === 'align') return '2. 각도기 밑금을 각의 밑변에 맞추세요';
    if (data.measureStage === 'read') {
      if (Number.isFinite(data.readAngle) && measureNumberVisible) return `3. 눈금 표시: ${data.readAngle}°`;
      if (Number.isFinite(data.readAngle)) return '3. 표시선을 알맞은 눈금에 멈춘 뒤 직접 읽어 보세요';
      return '3. 0°에서 출발해 알맞은 눈금까지 표시선을 움직이세요';
    }
    return '';
  }

  function measureReadIsCorrect(data) {
    return isMeasureMode(data)
      && data.mode !== 'measure-tutorial'
      && data.measureStage === 'read'
      && Number.isFinite(data.readAngle)
      && Math.abs(data.readAngle - data.answer) <= PROTRACTOR_READ_TOLERANCE;
  }

  function updateMeasureStatus(idx) {
    const label = document.getElementById(`ag-measure-status-${idx}`);
    if (!label) return;
    const data = playerData[idx];
    label.textContent = getMeasureStatusText(data);
    label.classList.toggle('ready', measureReadIsCorrect(data));
  }

  function snapMeasureOverlayToTarget(data) {
    if (!data?.overlay) return;
    data.overlay.currentX = data.overlay.targetX;
    data.overlay.currentY = data.overlay.targetY;
    data.overlay.currentScale = data.overlay.targetScale;
    data.overlay.currentAlpha = 1;
  }

  function snapMeasureOverlayRotation(data) {
    if (!data?.overlay) return;
    data.overlay.currentRotation = data.overlay.targetRotation;
  }

  function createMeasureGuideState() {
    return {
      frameId: null,
      running: false,
      step: 0,
      startProgress: 0,
      arcProgress: 0,
      endProgress: 0,
      phaseText: '시작하는 변 옆 0°를 먼저 봐요'
    };
  }

  function syncMeasureTutorialUi(idx) {
    const data = playerData[idx];
    if (!data || data.mode !== 'measure-tutorial' || !data.guide) return;
    const stepIndex = Math.max(0, Math.min(MEASURE_TUTORIAL_STEPS.length - 1, data.guide.step || 0));
    const stepLabel = document.getElementById(`ag-tutorial-step-${idx}`);
    const nextButton = document.getElementById(`ag-tutorial-next-${idx}`);
    if (stepLabel) stepLabel.textContent = `${stepIndex + 1}/${MEASURE_TUTORIAL_STEPS.length} 단계`;
    if (nextButton) {
      nextButton.textContent = stepIndex >= MEASURE_TUTORIAL_STEPS.length - 1 ? '처음부터' : '다음';
      nextButton.disabled = !!(data.answered || data.resolving);
    }
  }

  function applyMeasureTutorialStep(idx, canvas, stepIndex) {
    const data = playerData[idx];
    if (!data || data.mode !== 'measure-tutorial' || !data.guide) return;
    const nextStep = ((stepIndex % MEASURE_TUTORIAL_STEPS.length) + MEASURE_TUTORIAL_STEPS.length) % MEASURE_TUTORIAL_STEPS.length;
    const state = MEASURE_TUTORIAL_STEPS[nextStep];
    data.guide.step = nextStep;
    data.guide.running = false;
    data.guide.startProgress = state.startProgress;
    data.guide.arcProgress = state.arcProgress;
    data.guide.endProgress = state.endProgress;
    data.guide.phaseText = state.phaseText;
    drawMeasureScene(canvas, idx);
    syncMeasureTutorialUi(idx);
  }

  function advanceMeasureTutorialStep(idx, canvas) {
    const data = playerData[idx];
    if (!data || data.mode !== 'measure-tutorial' || !data.guide || data.answered || data.resolving) return;
    applyMeasureTutorialStep(idx, canvas, (data.guide.step || 0) + 1);
  }

  function getMeasureGuideGeometry(data) {
    if (!isMeasureMode(data) || !data.vertices) return null;
    const vertices = data.vertices;
    const selected = data.selectedVertex;
    const prev = vertices[(selected + vertices.length - 1) % vertices.length];
    const vertex = vertices[selected];
    const next = vertices[(selected + 1) % vertices.length];
    const prevAngle = normalizeAngle(Math.atan2(prev[1] - vertex[1], prev[0] - vertex[0]));
    const nextAngle = normalizeAngle(Math.atan2(next[1] - vertex[1], next[0] - vertex[0]));
    const prevDelta = clockwiseDelta(prevAngle, nextAngle);
    const baseUsesPrev = prevDelta <= Math.PI;
    const baseAngle = baseUsesPrev ? prevAngle : nextAngle;
    const endAngle = baseUsesPrev ? nextAngle : prevAngle;
    const clockwiseSpan = normalizeAngle(endAngle - baseAngle);
    const counterClockwiseSpan = normalizeAngle(baseAngle - endAngle);
    const useClockwise = clockwiseSpan <= counterClockwiseSpan;
    const measuredAngle = useClockwise ? clockwiseSpan : counterClockwiseSpan;
    const startPoint = baseUsesPrev ? prev : next;
    const finishPoint = baseUsesPrev ? next : prev;
    const startLength = Math.max(16, distance(vertex, startPoint) - 10);
    const endLength = Math.max(16, distance(vertex, finishPoint) - 10);
    const protractorRadius = PROTRACTOR_RADIUS * (data.overlay?.targetScale || 0.25);
    const arrowRadius = clamp(protractorRadius * 0.67, Math.min(startLength, endLength) * 0.26, protractorRadius * 0.78);
    const zeroLabelRadius = Math.min(protractorRadius * 0.88, arrowRadius + 18);
    return {
      vertex,
      baseAngle,
      endAngle,
      measuredAngle,
      directionSign: useClockwise ? 1 : -1,
      startLength,
      endLength,
      arrowRadius,
      zeroPoint: [
        vertex[0] + Math.cos(baseAngle) * arrowRadius,
        vertex[1] + Math.sin(baseAngle) * arrowRadius
      ],
      zeroLabelPoint: [
        vertex[0] + Math.cos(baseAngle) * zeroLabelRadius,
        vertex[1] + Math.sin(baseAngle) * zeroLabelRadius
      ]
    };
  }

  function drawPolygonBase(ctx, vertices, fillStyle, strokeStyle) {
    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i += 1) ctx.lineTo(vertices[i][0], vertices[i][1]);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function drawAngleMark(ctx, vertex, prev, next, radius, labelText, arcColor, textColor, fontSize) {
    const [vx, vy] = vertex;
    const [prevX, prevY] = normalizeVector(prev[0] - vx, prev[1] - vy);
    const [nextX, nextY] = normalizeVector(next[0] - vx, next[1] - vy);
    const startAngle = Math.atan2(prevY, prevX);
    const endAngle = Math.atan2(nextY, nextX);
    ctx.beginPath();
    ctx.arc(vx, vy, radius, startAngle, endAngle, useShortArc(startAngle, endAngle));
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    let bisector = [prevX + nextX, prevY + nextY];
    if (Math.hypot(bisector[0], bisector[1]) < 0.001) bisector = [-(prevY - nextY), prevX - nextX];
    const [bisX, bisY] = normalizeVector(bisector[0], bisector[1]);
    const edgeLimit = Math.min(distance(prev, vertex), distance(next, vertex));
    const labelDistance = Math.min(radius + fontSize * 0.7, edgeLimit * 0.38);
    const labelX = vx + bisX * labelDistance;
    const labelY = vy + bisY * labelDistance;
    ctx.font = `bold ${fontSize}px Outfit`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.98)';
    ctx.lineWidth = Math.max(4, fontSize * 0.34);
    ctx.strokeText(labelText, labelX, labelY);
    ctx.fillStyle = textColor;
    ctx.fillText(labelText, labelX, labelY);
  }

  function drawAngleWedge(ctx, vertex, prev, next, radius, fillStyle) {
    const [vx, vy] = vertex;
    const startAngle = Math.atan2(prev[1] - vy, prev[0] - vx);
    const endAngle = Math.atan2(next[1] - vy, next[0] - vx);
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.arc(vx, vy, radius, startAngle, endAngle, useShortArc(startAngle, endAngle));
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function pathRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function ensureQuizScene(data, width, height) {
    if (data.sceneWidth === width && data.sceneHeight === height && data.vertices) return;
    data.vertices = fitVertices(data.model.rawVertices, width, height, { paddingLeft: 28, paddingRight: 28, paddingTop: 24, paddingBottom: 20 });
    data.sceneWidth = width;
    data.sceneHeight = height;
  }

  function ensureMeasureScene(data, width, height) {
    if (data.sceneWidth === width && data.sceneHeight === height && data.vertices) return;
    const vertices = fitVertices(data.model.rawVertices, width, height, {
      paddingLeft: 28,
      paddingRight: 28,
      paddingTop: 26,
      paddingBottom: 24,
      targetVertexIndex: data.selectedVertex,
      targetVertexPos: [width * 0.48, height * 0.68]
    });
    data.vertices = vertices;
    data.sceneWidth = width;
    data.sceneHeight = height;
    const prev = vertices[(data.selectedVertex + vertices.length - 1) % vertices.length];
    const vertex = vertices[data.selectedVertex];
    const next = vertices[(data.selectedVertex + 1) % vertices.length];
    const base = chooseMeasureBase(vertex, prev, next);
    const edgeMin = Math.min(distance(prev, vertex), distance(next, vertex));
    const scale = clamp(edgeMin * 1.18, Math.min(width, height) * 0.42, Math.min(width, height) * 0.7) / PROTRACTOR_RADIUS;
    data.overlay.targetX = vertex[0];
    data.overlay.targetY = vertex[1];
    data.overlay.targetRotation = base.baseAngle;
    data.overlay.targetScale = scale;
    if (!data.overlay.animating) {
      data.overlay.currentX = vertex[0];
      data.overlay.currentY = vertex[1];
      data.overlay.currentRotation = base.baseAngle;
      data.overlay.currentScale = scale;
      data.overlay.currentAlpha = 1;
    }
  }

  function drawPolygonQuiz(canvas, idx) {
    const data = playerData[idx];
    if (!data) return;
    ensureQuizScene(data, canvas.width, canvas.height);
    const ctx = canvas.getContext('2d');
    const vertices = data.vertices;
    const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.06);
    const sideLengths = vertices.map((vertex, i) => distance(vertex, vertices[(i + 1) % vertices.length]));
    const arcRadius = Math.min(Math.min(...sideLengths) * 0.18, Math.min(canvas.width, canvas.height) * 0.09);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPolygonBase(ctx, vertices, data.mode === 'triangle' ? 'rgba(126, 87, 194, 0.12)' : 'rgba(92, 120, 255, 0.1)', '#6f58c9');
    for (let i = 0; i < vertices.length; i += 1) {
      const vertex = vertices[i];
      const prev = vertices[(i + vertices.length - 1) % vertices.length];
      const next = vertices[(i + 1) % vertices.length];
      const radius = Math.min(arcRadius, distance(prev, vertex) * 0.18, distance(next, vertex) * 0.18);
      const label = i === data.hiddenIndex ? (data.input ? `${data.input}°` : '?') : `${data.angles[i]}°`;
      drawAngleMark(ctx, vertex, prev, next, radius, label, i === data.hiddenIndex ? '#d96a6a' : '#4caf50', i === data.hiddenIndex ? '#b83232' : '#2e7d32', fontSize);
    }
  }

  function drawInteractiveProtractor(canvas, idx) {
    const data = playerData[idx];
    if (!data) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height - 20;
    const radius = data.radius;
    const selectedAngle = data.selectedAngle;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(92, 120, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(92, 120, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.88, Math.PI, 0);
    ctx.strokeStyle = 'rgba(92, 120, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let deg = 0; deg <= 180; deg += 1) {
      const rad = deg * DEG;
      const isTen = deg % 10 === 0;
      const isFive = deg % 5 === 0;
      const tickLength = isTen ? radius * 0.1 : (isFive ? radius * 0.07 : radius * 0.04);
      const outerX = cx + Math.cos(rad) * radius;
      const outerY = cy - Math.sin(rad) * radius;
      const innerX = cx + Math.cos(rad) * (radius - tickLength);
      const innerY = cy - Math.sin(rad) * (radius - tickLength);
      ctx.beginPath();
      ctx.moveTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
      ctx.strokeStyle = isTen ? 'rgba(40,40,48,0.82)' : (isFive ? 'rgba(40,40,48,0.42)' : 'rgba(40,40,48,0.2)');
      ctx.lineWidth = isTen ? 2 : 1;
      ctx.stroke();
      if (isTen) {
        const labelRadius = radius - tickLength - radius * 0.1;
        const tx = cx + Math.cos(rad) * labelRadius;
        const ty = cy - Math.sin(rad) * labelRadius;
        ctx.fillStyle = 'rgba(40,40,48,0.7)';
        ctx.font = `${Math.max(10, radius * 0.08)}px Outfit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(deg), tx, ty);
      }
    }

    ctx.beginPath();
    ctx.moveTo(cx - radius - 4, cy);
    ctx.lineTo(cx + radius + 4, cy);
    ctx.strokeStyle = 'rgba(40,40,48,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,40,48,0.88)';
    ctx.fill();

    if (selectedAngle !== null) {
      const rad = selectedAngle * DEG;
      const guideRadius = radius * 0.68;
      const lineRadius = radius + 5;
      const lx = cx + Math.cos(rad) * lineRadius;
      const ly = cy - Math.sin(rad) * lineRadius;
      const labelText = `${selectedAngle}°`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + guideRadius, cy);
      ctx.arc(cx, cy, guideRadius, 0, -rad, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(214, 69, 69, 0.12)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + lineRadius, cy);
      ctx.strokeStyle = 'rgba(214, 69, 69, 0.62)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = '#d64545';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.34, 0, -rad, true);
      ctx.strokeStyle = 'rgba(214, 69, 69, 0.84)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lx, ly, Math.max(5, radius * 0.035), 0, Math.PI * 2);
      ctx.fillStyle = '#d64545';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.96)';
      ctx.lineWidth = 3;
      ctx.stroke();
      const midRad = rad / 2;
      const tx = cx + Math.cos(midRad) * radius * 0.49;
      const ty = cy - Math.sin(midRad) * radius * 0.49;
      ctx.font = `bold ${Math.max(13, radius * 0.1)}px Outfit`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(255,255,255,0.98)';
      ctx.lineWidth = Math.max(4, radius * 0.03);
      ctx.strokeText(labelText, tx, ty);
      ctx.fillStyle = '#d64545';
      ctx.fillText(labelText, tx, ty);
    }
  }

  function drawGuideSegment(ctx, vertex, angle, length, progress, color, glowColor) {
    if (progress <= 0) return;
    const x = vertex[0] + Math.cos(angle) * length * progress;
    const y = vertex[1] + Math.sin(angle) * length * progress;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertex[0], vertex[1]);
    ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function drawGuideArrowArc(ctx, geometry, progress) {
    if (progress <= 0) return;
    const { vertex, baseAngle, measuredAngle, arrowRadius, directionSign } = geometry;
    const tipAngle = baseAngle + directionSign * measuredAngle * progress;
    const stepCount = Math.max(18, Math.ceil(progress * 44));
    ctx.save();
    ctx.beginPath();
    for (let step = 0; step <= stepCount; step += 1) {
      const t = step / stepCount;
      const angle = baseAngle + directionSign * measuredAngle * progress * t;
      const x = vertex[0] + Math.cos(angle) * arrowRadius;
      const y = vertex[1] + Math.sin(angle) * arrowRadius;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#ff8b3d';
    ctx.shadowColor = 'rgba(255, 139, 61, 0.42)';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const tipX = vertex[0] + Math.cos(tipAngle) * arrowRadius;
    const tipY = vertex[1] + Math.sin(tipAngle) * arrowRadius;
    const tangentAngle = tipAngle - Math.PI / 2;
    const wing = 13;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - Math.cos(tangentAngle - 0.55) * wing,
      tipY - Math.sin(tangentAngle - 0.55) * wing
    );
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX - Math.cos(tangentAngle + 0.55) * wing,
      tipY - Math.sin(tangentAngle + 0.55) * wing
    );
    ctx.strokeStyle = '#ff8b3d';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  function drawMeasureTutorialGuide(ctx, data) {
    if (data.mode !== 'measure-tutorial' || !data.guide) return;
    const geometry = getMeasureGuideGeometry(data);
    if (!geometry) return;

    drawGuideSegment(
      ctx,
      geometry.vertex,
      geometry.baseAngle,
      geometry.startLength,
      data.guide.startProgress,
      '#ff4d5e',
      'rgba(255, 77, 94, 0.36)'
    );

    drawGuideArrowArc(ctx, geometry, data.guide.arcProgress);

    drawGuideSegment(
      ctx,
      geometry.vertex,
      geometry.endAngle,
      geometry.endLength,
      data.guide.endProgress,
      '#ff9f43',
      'rgba(255, 159, 67, 0.34)'
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(geometry.zeroPoint[0], geometry.zeroPoint[1], 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff4d5e';
    ctx.lineWidth = 3;
    ctx.stroke();

    const zeroLabelWidth = 46;
    const zeroLabelHeight = 24;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = 'rgba(255, 77, 94, 0.35)';
    ctx.lineWidth = 2;
    pathRoundedRect(
      ctx,
      geometry.zeroLabelPoint[0] - zeroLabelWidth / 2,
      geometry.zeroLabelPoint[1] - zeroLabelHeight / 2,
      zeroLabelWidth,
      zeroLabelHeight,
      12
    );
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4d5e';
    ctx.font = 'bold 13px Outfit';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0°', geometry.zeroLabelPoint[0], geometry.zeroLabelPoint[1] + 0.5);

    const bubbleWidth = Math.min(280, Math.max(184, data.guide.phaseText.length * 9));
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = 'rgba(255, 160, 0, 0.28)';
    ctx.lineWidth = 2;
    pathRoundedRect(ctx, 18, 18, bubbleWidth, 34, 17);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#915f00';
    ctx.font = 'bold 14px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText(data.guide.phaseText, 32, 35);
    ctx.restore();
  }

  function drawMeasurePlacementHints(ctx, data) {
    if (!isMeasureMode(data) || data.mode === 'measure-tutorial' || !data.overlay) return;
    const geometry = getMeasureGuideGeometry(data);
    if (!geometry) return;

    ctx.save();
    if (data.measureStage === 'place') {
      ctx.beginPath();
      ctx.arc(geometry.vertex[0], geometry.vertex[1], PROTRACTOR_PLACE_TOLERANCE, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(108, 99, 255, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 7]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (data.measureStage === 'align') {
      const length = Math.min(PROTRACTOR_RADIUS * data.overlay.currentScale * 0.72, geometry.startLength);
      ctx.beginPath();
      ctx.moveTo(geometry.vertex[0], geometry.vertex[1]);
      ctx.lineTo(
        geometry.vertex[0] + Math.cos(geometry.baseAngle) * length,
        geometry.vertex[1] + Math.sin(geometry.baseAngle) * length
      );
      ctx.strokeStyle = '#ff4d5e';
      ctx.shadowColor = 'rgba(255, 77, 94, 0.34)';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    if (data.measureStage === 'read') {
      drawGuideArrowArc(ctx, geometry, 1);
      if (Number.isFinite(data.readAngle)) {
        const angle = geometry.baseAngle + geometry.directionSign * degToRad(data.readAngle);
        const radius = geometry.arrowRadius;
        const x = geometry.vertex[0] + Math.cos(angle) * radius;
        const y = geometry.vertex[1] + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(geometry.vertex[0], geometry.vertex[1]);
        ctx.lineTo(x, y);
        ctx.strokeStyle = measureReadIsCorrect(data) ? '#26a84a' : '#6c63ff';
        ctx.shadowColor = measureReadIsCorrect(data) ? 'rgba(38,168,74,0.34)' : 'rgba(108,99,255,0.28)';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMeasureScene(canvas, idx) {
    const data = playerData[idx];
    if (!data) return;
    ensureMeasureScene(data, canvas.width, canvas.height);
    const ctx = canvas.getContext('2d');
    const vertices = data.vertices;
    const selected = data.selectedVertex;
    const prev = vertices[(selected + vertices.length - 1) % vertices.length];
    const vertex = vertices[selected];
    const next = vertices[(selected + 1) % vertices.length];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPolygonBase(ctx, vertices, 'rgba(255, 196, 77, 0.1)', '#5f6470');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(vertex[0], vertex[1]);
    ctx.lineTo(next[0], next[1]);
    ctx.strokeStyle = '#f0a000';
    ctx.lineWidth = 4;
    ctx.stroke();
    drawAngleWedge(ctx, vertex, prev, next, Math.min(distance(prev, vertex), distance(next, vertex)) * 0.18, 'rgba(240,160,0,0.12)');
    ctx.beginPath();
    ctx.arc(vertex[0], vertex[1], 9, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f0a000';
    ctx.stroke();

    const overlay = data.overlay;
    if (protractorReady) {
      ctx.save();
      ctx.globalAlpha = overlay.currentAlpha;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(overlay.currentX, overlay.currentY);
      ctx.rotate(overlay.currentRotation);
      ctx.scale(overlay.currentScale, overlay.currentScale);
      ctx.drawImage(protractorImage, -PROTRACTOR_ORIGIN_X, -PROTRACTOR_ORIGIN_Y);
      ctx.restore();
    }

    if (data.mode === 'measure-tutorial') drawMeasureTutorialGuide(ctx, data);
    else drawMeasurePlacementHints(ctx, data);
    updateMeasureStatus(idx);
  }

  function animateMeasure(idx, canvas, onComplete = null) {
    const data = playerData[idx];
    if (!data || !isMeasureMode(data)) return;
    cancelMeasureAnimation(idx);
    const overlay = data.overlay;
    const from = {
      x: overlay.currentX,
      y: overlay.currentY,
      rotation: overlay.currentRotation,
      scale: overlay.currentScale,
      alpha: overlay.currentAlpha
    };
    const to = {
      x: overlay.targetX,
      y: overlay.targetY,
      rotation: overlay.targetRotation,
      scale: overlay.targetScale,
      alpha: 1
    };
    const start = performance.now();
    overlay.animating = true;
    const tick = (now) => {
      const t = clamp((now - start) / 700, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      overlay.currentX = lerp(from.x, to.x, eased);
      overlay.currentY = lerp(from.y, to.y, eased);
      overlay.currentRotation = lerpAngle(from.rotation, to.rotation, eased);
      overlay.currentScale = lerp(from.scale, to.scale, eased);
      overlay.currentAlpha = lerp(from.alpha, to.alpha, eased);
      drawMeasureScene(canvas, idx);
      if (t < 1) overlay.frameId = requestAnimationFrame(tick);
      else {
        overlay.frameId = null;
        overlay.animating = false;
        if (typeof onComplete === 'function') onComplete();
      }
    };
    overlay.frameId = requestAnimationFrame(tick);
  }

  function bindMeasureInteraction(canvas, idx) {
    if (canvas.dataset.measureBound === 'true') return;
    canvas.dataset.measureBound = 'true';
    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const canvasPoint = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return [
        (clientX - rect.left) * (canvas.width / rect.width),
        (clientY - rect.top) * (canvas.height / rect.height)
      ];
    };

    const applyPoint = (clientX, clientY, release = false) => {
      const data = playerData[idx];
      if (!data || data.mode !== 'measure' || data.answered || data.resolving || !data.overlay) return;
      const [x, y] = canvasPoint(clientX, clientY);
      const overlay = data.overlay;
      const vertices = data.vertices;
      const vertex = vertices[data.selectedVertex];

      if (data.measureStage === 'place') {
        overlay.currentX = x - dragOffsetX;
        overlay.currentY = y - dragOffsetY;
        overlay.currentAlpha = 1;
        const placed = distance([overlay.currentX, overlay.currentY], vertex) <= PROTRACTOR_PLACE_TOLERANCE;
        if (placed || release) {
          if (placed) {
            snapMeasureOverlayToTarget(data);
            data.measureStage = 'align';
          }
        }
      } else if (data.measureStage === 'align') {
        snapMeasureOverlayToTarget(data);
        overlay.currentRotation = Math.atan2(y - vertex[1], x - vertex[0]);
        const aligned = angleDistance(overlay.currentRotation, overlay.targetRotation) <= PROTRACTOR_ALIGN_TOLERANCE;
        if (aligned || release) {
          if (aligned) {
            snapMeasureOverlayRotation(data);
            data.measureStage = 'read';
            data.readAngle = null;
          }
        }
      } else if (data.measureStage === 'read') {
        snapMeasureOverlayToTarget(data);
        snapMeasureOverlayRotation(data);
        const geometry = getMeasureGuideGeometry(data);
        if (geometry) {
          const pointerAngle = normalizeAngle(Math.atan2(y - geometry.vertex[1], x - geometry.vertex[0]));
          const rawDelta = geometry.directionSign > 0
            ? normalizeAngle(pointerAngle - geometry.baseAngle)
            : normalizeAngle(geometry.baseAngle - pointerAngle);
          const clamped = clamp(radToDeg(rawDelta), 0, Math.round(radToDeg(geometry.measuredAngle)));
          data.readAngle = Math.round(clamped / 5) * 5;
        }
      }
      drawMeasureScene(canvas, idx);
    };

    const start = (clientX, clientY) => {
      const data = playerData[idx];
      if (!data || data.mode !== 'measure' || data.answered || data.resolving || !data.overlay) return;
      const [x, y] = canvasPoint(clientX, clientY);
      dragging = true;
      dragOffsetX = data.measureStage === 'place' ? x - data.overlay.currentX : 0;
      dragOffsetY = data.measureStage === 'place' ? y - data.overlay.currentY : 0;
      applyPoint(clientX, clientY, false);
    };

    const move = (clientX, clientY) => {
      if (!dragging) return;
      applyPoint(clientX, clientY, false);
    };

    const end = (clientX, clientY) => {
      if (!dragging) return;
      dragging = false;
      applyPoint(clientX, clientY, true);
    };

    canvas.addEventListener('mousedown', (event) => start(event.clientX, event.clientY));
    window.addEventListener('mousemove', (event) => move(event.clientX, event.clientY));
    window.addEventListener('mouseup', (event) => end(event.clientX, event.clientY));
    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) start(touch.clientX, touch.clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', (event) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      if (touch) end(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  function startMeasureTutorialAnimation(idx, canvas) {
    const data = playerData[idx];
    if (!data || data.mode !== 'measure-tutorial' || !data.guide) return;
    if (data.guide.frameId) cancelAnimationFrame(data.guide.frameId);
    data.guide.frameId = null;
    applyMeasureTutorialStep(idx, canvas, 0);
  }

  function bindBuildAngle(canvas, idx) {
    if (canvas.dataset.bound === 'true') return;
    canvas.dataset.bound = 'true';
    const handlePointer = (clientX, clientY) => {
      const data = playerData[idx];
      if (!data || data.answered) return;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (canvas.width / rect.width);
      const y = (clientY - rect.top) * (canvas.height / rect.height);
      const cx = canvas.width / 2;
      const cy = canvas.height - 20;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > data.radius * 1.3 || dist < data.radius * 0.2) return;
      let rad = Math.atan2(cy - y, x - cx);
      if (rad < 0) rad += Math.PI * 2;
      let deg = Math.round(radToDeg(rad));
      deg = clamp(deg, 0, 180);
      deg = Math.round(deg / 5) * 5;
      data.selectedAngle = deg;
      drawInteractiveProtractor(canvas, idx);
      window.handleAnswer(idx, deg === data.target);
    };
    canvas.addEventListener('mousedown', (event) => handlePointer(event.clientX, event.clientY));
    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      handlePointer(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  function setupBuildAngle(idx, body) {
    const target = randAngle5(5, 175);
    playerData[idx] = { mode: 'build-angle', target, selectedAngle: null, answered: false, resolving: false, radius: 0 };
    body.appendChild(prompt(`${target}°를 만들어 보세요`));
    const area = document.createElement('div');
    area.className = 'protractor-area';
    const canvas = document.createElement('canvas');
    area.appendChild(canvas);
    body.appendChild(area);
    setTimeout(() => {
      const size = Math.min(area.clientWidth, area.clientHeight * 1.7);
      const radius = Math.floor(size / 2) - 10;
      setCanvasBackingSize(canvas, size, Math.floor(size / 2) + 30);
      playerData[idx].radius = radius;
      drawInteractiveProtractor(canvas, idx);
      bindBuildAngle(canvas, idx);
    }, 30);
  }

  function setupTriangle(idx, body) {
    const model = createTriangleModel();
    const hiddenIndex = randInt(0, 2);
    playerData[idx] = { mode: 'triangle', model, angles: model.angles, hiddenIndex, answer: model.angles[hiddenIndex], input: '', answered: false, resolving: false, vertices: null, sceneWidth: 0, sceneHeight: 0 };
    body.appendChild(prompt('빈칸 각도를 구해 보세요'));
    const area = document.createElement('div');
    area.className = 'shape-area';
    const canvas = document.createElement('canvas');
    area.appendChild(canvas);
    body.appendChild(area);
    body.appendChild(createNumpad(idx));
    setTimeout(() => {
      setCanvasBackingSize(canvas, area.clientWidth, area.clientHeight);
      drawPolygonQuiz(canvas, idx);
    }, 30);
  }

  function setupQuad(idx, body) {
    const model = createQuadModel();
    const hiddenIndex = randInt(0, 3);
    playerData[idx] = { mode: 'quad', model, angles: model.angles, hiddenIndex, answer: model.angles[hiddenIndex], input: '', answered: false, resolving: false, vertices: null, sceneWidth: 0, sceneHeight: 0 };
    body.appendChild(prompt('숨겨진 각을 찾아 보세요'));
    const area = document.createElement('div');
    area.className = 'shape-area';
    const canvas = document.createElement('canvas');
    area.appendChild(canvas);
    body.appendChild(area);
    body.appendChild(createNumpad(idx));
    setTimeout(() => {
      setCanvasBackingSize(canvas, area.clientWidth, area.clientHeight);
      drawPolygonQuiz(canvas, idx);
    }, 30);
  }

  function createMeasureQuestion(width, height, options = {}) {
    const tutorial = options.tutorial === true;
    while (true) {
      const useTriangle = Math.random() < 0.5;
      const model = useTriangle ? createTriangleModel() : createQuadModel();
      const count = useTriangle ? 3 : 4;
      const selectedVertex = randInt(0, count - 1);
      const vertices = fitVertices(model.rawVertices, width, height, {
        paddingLeft: 28,
        paddingRight: 28,
        paddingTop: 26,
        paddingBottom: 24,
        targetVertexIndex: selectedVertex,
        targetVertexPos: [width * 0.48, height * 0.68]
      });
      const prev = vertices[(selectedVertex + count - 1) % count];
      const vertex = vertices[selectedVertex];
      const next = vertices[(selectedVertex + 1) % count];
      const edgeMin = Math.min(distance(prev, vertex), distance(next, vertex));
      if (edgeMin < Math.min(width, height) * 0.18) continue;
      const base = chooseMeasureBase(vertex, prev, next);
      const scale = clamp(edgeMin * 1.18, Math.min(width, height) * 0.42, Math.min(width, height) * 0.7) / PROTRACTOR_RADIUS;
      const startOffsetX = tutorial ? Math.min(90, width * 0.08) : Math.min(150, width * 0.16);
      const startOffsetY = tutorial ? height + Math.min(140, height * 0.22) : Math.min(height * 0.16, 90);
      return {
        mode: tutorial ? 'measure-tutorial' : 'measure',
        shapeType: useTriangle ? 'triangle' : 'quad',
        model,
        angles: model.angles,
        selectedVertex,
        answer: model.angles[selectedVertex],
        input: '',
        answered: false,
        resolving: false,
        vertices,
        sceneWidth: width,
        sceneHeight: height,
        overlay: {
          targetX: vertex[0],
          targetY: vertex[1],
          targetRotation: base.baseAngle,
          targetScale: scale,
          currentX: vertex[0] + startOffsetX,
          currentY: tutorial ? startOffsetY : vertex[1] + startOffsetY,
          currentRotation: base.baseAngle - degToRad(18),
          currentScale: scale * 0.84,
          currentAlpha: tutorial ? 0 : 0.92,
          frameId: null,
          animating: false
        },
        measureStage: tutorial ? 'tutorial' : 'place',
        readAngle: null,
        guide: tutorial ? createMeasureGuideState() : null
      };
    }
  }

  function setupMeasureBody(idx, body, options = {}) {
    const tutorial = options.tutorial === true;
    if (!tutorial) body.appendChild(prompt('표시된 꼭짓점의 각을 각도기로 재어 입력하세요'));
    if (!tutorial) {
      const status = document.createElement('div');
      status.className = 'ag-measure-status';
      status.id = `ag-measure-status-${idx}`;
      status.textContent = '1. 각도기 중심점을 표시된 꼭짓점에 드래그하세요';
      body.appendChild(status);
    }
    const area = document.createElement('div');
    area.className = 'shape-area measure-area';
    const canvas = document.createElement('canvas');
    area.appendChild(canvas);
    body.appendChild(area);
    if (tutorial) {
      const controls = document.createElement('div');
      controls.className = 'ag-tutorial-controls';
      controls.innerHTML = `
        <span class="ag-tutorial-step" id="ag-tutorial-step-${idx}">1/${MEASURE_TUTORIAL_STEPS.length} 단계</span>
        <button type="button" class="ag-tutorial-next" id="ag-tutorial-next-${idx}">다음</button>
      `;
      body.appendChild(controls);
      controls.querySelector('button')?.addEventListener('click', () => {
        advanceMeasureTutorialStep(idx, canvas);
      });
    }
    body.appendChild(createNumpad(idx));
    setTimeout(() => {
      setCanvasBackingSize(canvas, area.clientWidth, area.clientHeight);
      playerData[idx] = createMeasureQuestion(canvas.width, canvas.height, { tutorial });
      drawMeasureScene(canvas, idx);
      if (tutorial) {
        animateMeasure(idx, canvas, () => {
          startMeasureTutorialAnimation(idx, canvas);
        });
      } else {
        bindMeasureInteraction(canvas, idx);
      }
    }, 30);
  }

  function setupMeasure(idx, body) {
    setupMeasureBody(idx, body, { tutorial: false });
  }

  function setupMeasureTutorial(idx, body) {
    setupMeasureBody(idx, body, { tutorial: true });
  }

  function feedbackText(data, correct) {
    if (!data) return correct ? 'O' : 'X';
    if (data.mode === 'build-angle' && typeof data.selectedAngle === 'number') {
      return `${correct ? 'O' : 'X'} ${data.selectedAngle}°`;
    }
    if (typeof data.input === 'string' && data.input) {
      return `${correct ? 'O' : 'X'} ${data.input}°`;
    }
    if (correct && typeof data.answer === 'number') {
      return `O ${data.answer}°`;
    }
    return correct ? 'O' : 'X';
  }

  function getHoldMs(data, correct) {
    if (data?.mode === 'build-angle') return correct ? 1500 : 1250;
    if (isMeasureMode(data)) return correct ? 1650 : 1300;
    return correct ? 1200 : 1100;
  }

  function clearFeedback(idx) {
    const cell = document.getElementById(`cell-${idx}`);
    const feedback = document.getElementById(`feedback-${idx}`);
    if (cell) {
      cell.classList.remove('disabled');
      cell.classList.remove('shake');
    }
    if (feedback) {
      feedback.className = 'feedback-overlay';
      feedback.textContent = '';
    }
  }

  function recordSessionResults() {
    if (sessionResultsRecorded) return;
    sessionResultsRecorded = true;

    let hasNamedPlayers = false;
    sessionStudents.forEach((student, idx) => {
      if (!student) return;
      const target = getStudentById(student.id);
      if (!target) return;
      if (!Array.isArray(target.records)) target.records = [];
      target.records.push({
        score: scores[idx],
        game: currentGame,
        timestamp: new Date().toISOString(),
        timerSeconds: getConfiguredTimerSeconds()
      });
      hasNamedPlayers = true;
    });

    if (!hasNamedPlayers) return;
    markSessionStudentsAsPlayed();
    saveStudentState();
    queueConnectedFileSave();
  }

  function renderResultRow(container, playerIdx, position, studentsForResult = sessionStudents) {
    const item = document.createElement('div');
    item.className = 'rank-item';

    const posEl = document.createElement('div');
    posEl.className = `rank-pos ${position === 0 ? 'gold' : position === 1 ? 'silver' : position === 2 ? 'bronze' : 'normal'}`;
    posEl.textContent = position < 3 ? ['🥇', '🥈', '🥉'][position] : String(position + 1);
    item.appendChild(posEl);

    const nameEl = document.createElement('div');
    nameEl.className = 'rank-name';
    const main = document.createElement('span');
    main.className = 'ag-rank-main';
    main.textContent = getPlayerLabelFromList(playerIdx, studentsForResult);
    nameEl.appendChild(main);
    const subLabel = getPlayerSubLabelFromList(playerIdx, studentsForResult);
    if (subLabel) {
      const sub = document.createElement('span');
      sub.className = 'ag-rank-sub';
      sub.textContent = subLabel;
      nameEl.appendChild(sub);
    }
    item.appendChild(nameEl);

    const scoreEl = document.createElement('div');
    scoreEl.className = 'rank-score';
    scoreEl.textContent = `${scores[playerIdx]}점`;
    item.appendChild(scoreEl);

    container.appendChild(item);
  }

  window.numpadInput = function numpadInputOverride(idx, ch) {
    const data = playerData[idx];
    if (!data || data.answered || data.resolving || typeof data.input !== 'string') return;
    if (data.mode === 'measure' && !measureReadIsCorrect(data)) return;
    if (data.input.length >= 3) return;
    data.input += ch;
    if (data.input.length > 1) data.input = String(parseInt(data.input, 10));
    window.updateNumDisplay(idx);
    window.redrawShape(idx);
  };

  window.numpadDelete = function numpadDeleteOverride(idx) {
    const data = playerData[idx];
    if (!data || data.answered || data.resolving || typeof data.input !== 'string') return;
    if (data.mode === 'measure' && !measureReadIsCorrect(data)) return;
    data.input = data.input.slice(0, -1);
    window.updateNumDisplay(idx);
    window.redrawShape(idx);
  };

  window.numpadConfirm = function numpadConfirmOverride(idx) {
    const data = playerData[idx];
    if (!data || data.answered || data.resolving || typeof data.input !== 'string' || !data.input) return;
    if (data.mode === 'measure' && !measureReadIsCorrect(data)) return;
    const value = Number.parseInt(data.input, 10);
    if (Number.isNaN(value)) return;
    window.handleAnswer(idx, value === data.answer);
  };

  window.updateNumDisplay = function updateNumDisplayOverride(idx) {
    const display = document.getElementById(`numdisp-${idx}`);
    if (!display) return;
    const data = playerData[idx];
    display.textContent = data?.input || '';
  };

  window.toggleFullscreen = function toggleFullscreenOverride() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  window.redrawShape = function redrawShapeOverride(idx) {
    const data = playerData[idx];
    const body = document.getElementById(`body-${idx}`);
    const canvas = body?.querySelector('canvas');
    if (!data || !canvas) return;
    if (data.mode === 'build-angle') drawInteractiveProtractor(canvas, idx);
    else if (data.mode === 'triangle' || data.mode === 'quad') drawPolygonQuiz(canvas, idx);
    else if (isMeasureMode(data)) drawMeasureScene(canvas, idx);
  };

  window.handleAnswer = function handleAnswerOverride(idx, correct, forced = false) {
    const data = playerData[idx];
    if (!data) return;
    if ((data.answered || data.resolving) && !forced) return;

    data.answered = true;
    data.resolving = true;
    if (data.mode === 'measure-tutorial') syncMeasureTutorialUi(idx);

    const cell = document.getElementById(`cell-${idx}`);
    const feedback = document.getElementById(`feedback-${idx}`);
    if (cell) cell.classList.add('disabled');

    if (correct) {
      scores[idx] += 1;
      streaks[idx] += 1;
    } else {
      streaks[idx] = 0;
      if (cell) cell.classList.add('shake');
    }
    updateScoreboard(idx);

    if (feedback) {
      feedback.textContent = feedbackText(data, correct);
      feedback.className = `feedback-overlay show ${correct ? 'correct' : 'wrong'}`;
    }

    if (!gameActive) return;

    setTimeout(() => {
      if (!gameActive) return;
      if (correct) {
        cancelMeasureAnimation(idx);
        window.generatePlayerQuestion(idx);
        return;
      }

      data.answered = false;
      data.resolving = false;
      if (typeof data.input === 'string') data.input = '';
      if (data.mode === 'build-angle') data.selectedAngle = null;

      clearFeedback(idx);
      window.updateNumDisplay(idx);
      window.redrawShape(idx);
      if (data.mode === 'measure-tutorial') {
        const canvas = document.getElementById(`body-${idx}`)?.querySelector('canvas');
        if (canvas) startMeasureTutorialAnimation(idx, canvas);
      }
    }, getHoldMs(data, correct));
  };

  window.exitGame = function exitGameOverride() {
    gameActive = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    cancelAllAnimations();
    setStudentSidebarOpen(false);
    renderSelectionUi();
    showScreen('game-select-screen');
  };

  window.selectPlayers = function selectPlayersOverride(n) {
    playerCount = n;
    refreshStudentAssignments({ advance: true });
    setStudentSidebarOpen(false);
    showScreen('game-select-screen');
  };

  window.startGame = function startGameOverride(gameNum) {
    if (!playerCount) return;
    setStudentSidebarOpen(false);
    cancelAllAnimations();
    if (getRequiredStudentCount()) {
      let activeCount = getActiveStudentIds().length;
      if (!activeCount) {
        assignNextUnplayedStudents({ resetIfComplete: true });
      }
      activeCount = getActiveStudentIds().length;
      if (!activeCount) return;
      if (activeCount !== playerCount) playerCount = activeCount;
      if (!sessionMatchesActiveStudents()) syncSessionStudentsFromActive();
    } else if (sessionStudents.length !== playerCount) {
      refreshStudentAssignments({ advance: true });
    }
    selectedGame = normalizeGameNumber(gameNum);
    currentGame = selectedGame;
    currentRound = 1;
    scores = Array(playerCount).fill(0);
    streaks = Array(playerCount).fill(0);
    answeredThisRound = Array(playerCount).fill(false);
    gameActive = true;
    sessionResultsRecorded = false;

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) retryBtn.onclick = () => window.startGame(currentGame);

    renderTopbar();
    window.setupRound();
  };

  window.setupRound = function setupRoundOverride() {
    cancelAllAnimations();
    const grid = document.getElementById('game-grid');
    if (!grid) return;
    const template = getGridTemplate(playerCount);
    grid.style.gridTemplateColumns = template.cols;
    grid.style.gridTemplateRows = template.rows;
    grid.style.gap = '0';
    grid.innerHTML = '';

    playerData = [];
    renderTopbar();

    for (let idx = 0; idx < playerCount; idx += 1) {
      const cell = document.createElement('div');
      cell.className = `player-cell color-theme-${idx % 6}`;
      if (currentGame === 5) cell.classList.add('ag-tutorial-cell');
      cell.id = `cell-${idx}`;
      cell.innerHTML = buildCell(idx);
      grid.appendChild(cell);
      updateScoreboard(idx);
      window.generatePlayerQuestion(idx);
    }

    window.startTimer();
    showScreen('game-screen');
  };

  window.startTimer = function startTimerOverride() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = getConfiguredTimerSeconds();
    window.updateTimerDisplay();
    if (timeLeft === null) return;
    timerInterval = setInterval(() => {
      if (!gameActive) return;
      timeLeft -= 1;
      window.updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        window.timeUp();
      }
    }, 1000);
  };

  window.updateTimerDisplay = function updateTimerDisplayOverride() {
    const timer = document.getElementById('time-left');
    if (!timer) return;
    timer.textContent = formatTimerValue(timeLeft);
    timer.title = timeLeft === null ? '무제한' : `${formatTimerValue(timeLeft)} 남음`;
  };

  window.timeUp = function timeUpOverride() {
    if (!gameActive) return;
    gameActive = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    cancelAllAnimations();
    playerData.forEach((data) => {
      if (!data) return;
      data.answered = true;
      data.resolving = true;
    });
    window.showResults();
  };

  window.generatePlayerQuestion = function generatePlayerQuestionOverride(idx) {
    if (!gameActive) return;
    cancelMeasureAnimation(idx);

    const body = document.getElementById(`body-${idx}`);
    if (!body) return;
    body.innerHTML = '';
    clearFeedback(idx);

    if (currentGame === 1) setupBuildAngle(idx, body);
    else if (currentGame === 2) setupTriangle(idx, body);
    else if (currentGame === 3) setupQuad(idx, body);
    else if (currentGame === 4) setupMeasure(idx, body);
    else setupMeasureTutorial(idx, body);
  };

  window.showResults = function showResultsOverride() {
    const list = document.getElementById('ranking-list');
    const title = document.querySelector('#result-screen .result-title');
    if (!list) return;

    const studentsForResult = sessionStudents.slice();
    recordSessionResults();
    if (title) title.textContent = '최종 결과';
    list.innerHTML = '';

    const ranking = Array.from({ length: playerCount }, (_, idx) => idx)
      .sort((a, b) => scores[b] - scores[a]);

    ranking.forEach((playerIdx, position) => renderResultRow(list, playerIdx, position, studentsForResult));
    prepareAssignmentsAfterResult();
    showScreen('result-screen');
  };

  window.setupProtractor = setupBuildAngle;
  window.setupTriangle = setupTriangle;
  window.setupQuad = setupQuad;
  window.setupMeasure = setupMeasure;
  window.setupMeasureTutorial = setupMeasureTutorial;

  bootstrapUi();
})();

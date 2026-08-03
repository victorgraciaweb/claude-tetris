'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#9fa8da', // J - indigo pálido
  '#ffb74d', // L - orange
  '#f06292', // + - pink
  '#4db6ac', // L larga - teal
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                  // +
  [[9,0,0],[9,0,0],[9,9,0]],                  // L larga
];

const PASTEL_COLORS = [
  null,
  '#b3e5f0', // I
  '#ffecb3', // O
  '#e1bee7', // T
  '#c8e6c9', // S
  '#f5c6c6', // Z
  '#d4d9f0', // J
  '#ffe0b2', // L
  '#f8c8d8', // +
  '#c0e4df', // L larga
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const RAYO_TRIGGER_LINES = 3;
const RAYO_BONUS_SCORE = 500;
const RAYO_FLASH_MS = 400;

const HIGHSCORES_KEY = 'tetrisHighScores';
const BEST_COMBO_KEY = 'tetrisBestCombo';
const MAX_LINES_KEY = 'tetrisMaxLines';
const MAX_HIGHSCORES = 5;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const skinSelect = document.getElementById('skin-select');

// ---- Pantalla de inicio / puntuaciones ----
const startOverlay = document.getElementById('start-overlay');
const playBtn = document.getElementById('play-btn');
const startHighscoresList = document.getElementById('start-highscores-list');
const startBestComboEl = document.getElementById('start-best-combo');
const startMaxLinesEl = document.getElementById('start-max-lines');
const resetScoresBtn = document.getElementById('reset-scores-btn');
const nameFormWrapper = document.getElementById('name-form-wrapper');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const gameoverHighscoresList = document.getElementById('gameover-highscores-list');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, rayoFlash, rayoProgress, comboCount, bestCombo;
let currentSkin = 'retro';
let pendingScoreToSave = null;

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggleBtn.addEventListener('click', () => {
  const theme = document.body.classList.contains('light') ? 'dark' : 'light';
  applyTheme(theme);
  localStorage.setItem('theme', theme);
});

function applySkin(name) {
  currentSkin = name;
  document.body.classList.remove('skin-retro', 'skin-neon', 'skin-pastel', 'skin-pixel');
  document.body.classList.add(`skin-${name}`);
  if (board && current) draw();
  if (next) drawNext();
}

function initSkin() {
  const saved = localStorage.getItem('skin');
  const skin = ['retro', 'neon', 'pastel', 'pixel'].includes(saved) ? saved : 'retro';
  applySkin(skin);
  skinSelect.value = skin;
}

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  localStorage.setItem('skin', skinSelect.value);
});

// ---- Puntuaciones altas ----
function loadHighScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(HIGHSCORES_KEY));
    return Array.isArray(raw) ? [...raw].sort((a, b) => b.score - a.score) : [];
  } catch {
    return [];
  }
}

function saveHighScores(list) {
  const sorted = [...list].sort((a, b) => b.score - a.score).slice(0, MAX_HIGHSCORES);
  localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(sorted));
  return sorted;
}

function loadIntSetting(key) {
  return parseInt(localStorage.getItem(key), 10) || 0;
}

function loadBestCombo() {
  return loadIntSetting(BEST_COMBO_KEY);
}

function loadMaxLines() {
  return loadIntSetting(MAX_LINES_KEY);
}

function qualifiesForHighScore(value, list = loadHighScores()) {
  if (list.length < MAX_HIGHSCORES) return true;
  return value > list[list.length - 1].score;
}

function renderHighScores(listEl, highlightEntry, list = loadHighScores()) {
  listEl.innerHTML = '';
  let highlighted = false;
  list.forEach((entry, idx) => {
    const li = document.createElement('li');
    if (!highlighted && entry === highlightEntry) {
      li.classList.add('current-score');
      highlighted = true;
    }
    const rankSpan = document.createElement('span');
    rankSpan.className = 'hs-rank';
    rankSpan.textContent = `${idx + 1}.`;
    const nameSpan = document.createElement('span');
    nameSpan.className = 'hs-name';
    nameSpan.textContent = entry.name;
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'hs-score';
    scoreSpan.textContent = entry.score.toLocaleString();
    li.appendChild(rankSpan);
    li.appendChild(nameSpan);
    li.appendChild(scoreSpan);
    listEl.appendChild(li);
  });
}

function renderStartStats() {
  startBestComboEl.textContent = loadBestCombo();
  startMaxLinesEl.textContent = loadMaxLines();
}

playBtn.addEventListener('click', () => {
  startOverlay.classList.add('hidden');
  paused = false;
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

resetScoresBtn.addEventListener('click', () => {
  localStorage.removeItem(HIGHSCORES_KEY);
  localStorage.removeItem(BEST_COMBO_KEY);
  localStorage.removeItem(MAX_LINES_KEY);
  bestCombo = 0;
  renderHighScores(startHighscoresList);
  renderStartStats();
});

saveScoreBtn.addEventListener('click', () => {
  if (pendingScoreToSave === null) return;
  const name = playerNameInput.value.trim() || 'Jugador';
  const newEntry = { name, score: pendingScoreToSave };
  const list = loadHighScores();
  list.push(newEntry);
  const sorted = saveHighScores(list);
  renderHighScores(gameoverHighscoresList, newEntry, sorted);
  nameFormWrapper.classList.add('hidden');
  pendingScoreToSave = null;
});

playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') saveScoreBtn.click();
});

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 9) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
    comboCount++;
    bestCombo = Math.max(bestCombo, comboCount);
    rayoProgress += cleared;
    if (rayoProgress >= RAYO_TRIGGER_LINES) {
      rayoProgress -= RAYO_TRIGGER_LINES;
      triggerRayo();
      updateHUD();
    }
  }
  return cleared;
}

function triggerRayo() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) if (board[r].some(v => v !== 0)) rows.push(r);
  const cols = [];
  for (let c = 0; c < COLS; c++) if (board.some(row => row[c] !== 0)) cols.push(c);
  if (!rows.length || !cols.length) return;

  const row = rows[Math.floor(Math.random() * rows.length)];
  const col = cols[Math.floor(Math.random() * cols.length)];

  board[row].fill(0);
  for (let r = 0; r < ROWS; r++) board[r][col] = 0;

  score += RAYO_BONUS_SCORE * level;
  rayoFlash = { row, col, until: performance.now() + RAYO_FLASH_MS };
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (!cleared) comboCount = 0;
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;

  const px = x * size + 1;
  const py = y * size + 1;
  const w = size - 2;
  const h = size - 2;

  if (currentSkin === 'neon') {
    context.shadowBlur = 12;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    context.shadowBlur = 0;
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px, py, w, 4);
  } else if (currentSkin === 'pastel') {
    const pastelColor = PASTEL_COLORS[colorIndex] || color;
    context.fillStyle = pastelColor;
    context.beginPath();
    context.roundRect(px, py, w, h, 4);
    context.fill();
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.beginPath();
    context.roundRect(px, py, w, 4, 2);
    context.fill();
  } else if (currentSkin === 'pixel') {
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    const halfW = w / 2;
    const halfH = h / 2;
    context.fillStyle = 'rgba(0,0,0,0.15)';
    context.fillRect(px, py, halfW, halfH);
    context.fillRect(px + halfW, py + halfH, halfW, halfH);
    context.fillStyle = 'rgba(255,255,255,0.15)';
    context.fillRect(px + halfW, py, halfW, halfH);
    context.fillRect(px, py + halfH, halfW, halfH);
  } else {
    // retro (default)
    context.fillStyle = color;
    context.fillRect(px, py, w, h);
    // highlight
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(px, py, w, 4);
  }

  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

  drawRayoFlash();
}

function drawRayoFlash() {
  if (!rayoFlash) return;
  const remaining = rayoFlash.until - performance.now();
  if (remaining <= 0) {
    rayoFlash = null;
    return;
  }
  const alpha = 0.35 + 0.35 * (remaining / RAYO_FLASH_MS);
  ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`;
  ctx.fillRect(0, rayoFlash.row * BLOCK, COLS * BLOCK, BLOCK);
  ctx.fillRect(rayoFlash.col * BLOCK, 0, BLOCK, ROWS * BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  localStorage.setItem(BEST_COMBO_KEY, bestCombo);
  localStorage.setItem(MAX_LINES_KEY, Math.max(loadMaxLines(), lines));

  const highScores = loadHighScores();
  if (qualifiesForHighScore(score, highScores)) {
    pendingScoreToSave = score;
    playerNameInput.value = '';
    nameFormWrapper.classList.remove('hidden');
  } else {
    pendingScoreToSave = null;
    nameFormWrapper.classList.add('hidden');
  }
  renderHighScores(gameoverHighscoresList, null, highScores);

  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  rayoFlash = null;
  rayoProgress = 0;
  comboCount = 0;
  bestCombo = loadBestCombo();
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

initTheme();
initSkin();
init();

// ---- Pantalla de inicio ----
paused = true;
cancelAnimationFrame(animId);
renderHighScores(startHighscoresList);
renderStartStats();
startOverlay.classList.remove('hidden');

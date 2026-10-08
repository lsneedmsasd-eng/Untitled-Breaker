// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 450


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 4;
const CAMPAIGN_LEVELS = 50;
const CAMPAIGN_SAVE_KEY = "block-breaker-campaign-v1";
let gameMode = null;
let lastCampaignSave = 0;
let speedSetting = 1;
let ballSpeed = BALL_SPEED * speedSetting;
const PADDLE_BASE_WIDTH = 90;
const PADDLE_SLOW_FACTOR = 0.5;
const PADDLE_SLOW_DURATION = 1600;
const MAX_LIVES = 5;
const PADDLE_GROW_DURATION = 8000;
let paddleGrowTimer = 0;
let paddleSlowTimer = 0;
const BALL_SLOW_FACTOR = 0.65;
const BALL_SLOW_DURATION = 6000;
let ballSlowTimer = 0;
let soundEnabled = true;
let audioContext = null;

const SOUND_PRESETS = {
  brick: { frequency: 310, duration: 0.07, waveform: "triangle" },
  giant: { frequency: 150, duration: 0.16, waveform: "square" },
  paddle: { frequency: 520, duration: 0.08, waveform: "sine" },
  heart: { frequency: 790, duration: 0.16, waveform: "sine" },
  grow: { frequency: 430, duration: 0.14, waveform: "triangle" },
  slow: { frequency: 240, duration: 0.2, waveform: "sawtooth" },
  jackpot: { frequency: 920, duration: 0.22, waveform: "sine" },
  bomb: { frequency: 95, duration: 0.28, waveform: "sawtooth" },
  launch: { frequency: 360, duration: 0.12, waveform: "triangle" },
  lifeLost: { frequency: 170, duration: 0.24, waveform: "sawtooth" }
};

function initializeAudio() {
  if (!soundEnabled || audioContext) {
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) {
    audioContext = new AudioContextClass();
  }
}

function playSound(name) {
  if (!soundEnabled) {
    return;
  }
  initializeAudio();
  if (!audioContext) {
    return;
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const preset = SOUND_PRESETS[name];
  if (!preset) {
    return;
  }
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = preset.waveform;
  oscillator.frequency.setValueAtTime(preset.frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + preset.duration);
}

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0
};

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  ball.vx = 0;
  ball.vy = 0;
  ballSlowTimer = 0;
  positionBallOnPaddle();
}

function positionBallOnPaddle() {
  ball.x = paddle.x + paddle.width / 2 - ball.width / 2;
  ball.y = paddle.y - ball.height - 2;
}

function fillRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fill();
}

function launchBall() {
  if (gameState !== "ready") {
    return;
  }
  const horizontalSpeed = (Math.random() * 0.5 - 0.25) * ballSpeed;
  ball.vx = horizontalSpeed;
  ball.vy = -Math.sqrt(ballSpeed * ballSpeed - horizontalSpeed * horizontalSpeed);
  showScreen("playing");
  playSound("launch");
}


// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: PADDLE_BASE_WIDTH,
  height: 12,
  speed: 6
};
const AIM_RANGE = 180;
const AIM_COOLDOWN = 15000;


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];
let score = 0;
let wave = 1;
let lives = 3;
let gameState = "menu";
let selectedTarget = null;
let aimCooldown = 0;
let particlesEnabled = true;
let particles = [];
let pausedState = "playing";


// ------------------------------------------------------------
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ------------------------------------------------------------
const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if ((key === "escape" || key === "p") && gameState === "playing") {
    pausedState = gameState;
    showScreen("paused");
  } else if ((key === "escape" || key === "p") && gameState === "ready") {
    pausedState = gameState;
    showScreen("paused");
  } else if ((key === "escape" || key === "p") && gameState === "paused") {
    showScreen(pausedState);
  } else if (key === " " && gameState === "ready") {
    launchBall();
  }
  // Stop the arrow keys from scrolling the page.
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
  if (event.key === " ") {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function getCanvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * WIDTH / bounds.width,
    y: (event.clientY - bounds.top) * HEIGHT / bounds.height
  };
}

canvas.addEventListener("click", function (event) {
  if (gameState === "ready") {
    launchBall();
    return;
  }
  if (gameState !== "playing") {
    return;
  }
  if (aimCooldown > 0) {
    return;
  }

  const point = getCanvasPoint(event);
  const target = bricks.find((brick) =>
    point.x >= brick.x && point.x <= brick.x + brick.width &&
    point.y >= brick.y && point.y <= brick.y + brick.height
  );

  const paddleCenter = paddle.x + paddle.width / 2;
  if (target && Math.abs(target.x + target.width / 2 - paddleCenter) <= AIM_RANGE) {
    selectedTarget = target;
    aimCooldown = AIM_COOLDOWN;
  } else {
    selectedTarget = null;
  }
});


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (gameState === "ready") {
    movePaddle();
    positionBallOnPaddle();
    return;
  }
  if (gameState !== "playing") {
    return;
  }

  aimCooldown = Math.max(0, aimCooldown - STEP);
  updatePaddleSlow(STEP);
  movePaddle();
  updatePaddleGrow(STEP);
  updateBallSlow(STEP);
  moveBall();

  bounceOffWalls();   // collisions.js
  bounceOffPaddle();  // collisions.js
  bounceOffBricks();  // collisions.js
  updateBrickWeapons(STEP);  // bricks.js
  updateParticles(STEP);

  if (bricks.length === 0) {
    startNextWave();
  }

  // Losing the ball costs a life.
  if (ball.y > HEIGHT) {
    loseLife();
  }
}

function loseLife() {
  lives--;
  playSound("lifeLost");
  selectedTarget = null;
  if (lives <= 0) {
    if (gameMode === "campaign") {
      clearCampaignSave();
    }
    document.getElementById("final-score").textContent = `Final score: ${score}`;
    showScreen("gameover");
    return;
  }
  resetBall();
  showScreen("ready");
}

function grantHeart() {
  lives = Math.min(MAX_LIVES, lives + 1);
}

function activatePaddleGrow() {
  const center = paddle.x + paddle.width / 2;
  paddle.width = PADDLE_BASE_WIDTH * 1.6;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
  paddleGrowTimer = PADDLE_GROW_DURATION;
}

function updatePaddleGrow(deltaTime) {
  if (paddleGrowTimer <= 0) {
    return;
  }
  paddleGrowTimer = Math.max(0, paddleGrowTimer - deltaTime);
  if (paddleGrowTimer === 0) {
    const center = paddle.x + paddle.width / 2;
    paddle.width = PADDLE_BASE_WIDTH;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
  }
}

function slowPaddle() {
  paddleSlowTimer = Math.max(paddleSlowTimer, PADDLE_SLOW_DURATION);
}

function updatePaddleSlow(deltaTime) {
  paddleSlowTimer = Math.max(0, paddleSlowTimer - deltaTime);
}

function applyBallSlow() {
  if (ballSlowTimer <= 0) {
    ball.vx *= BALL_SLOW_FACTOR;
    ball.vy *= BALL_SLOW_FACTOR;
  }
  ballSlowTimer = BALL_SLOW_DURATION;
}

function updateBallSlow(deltaTime) {
  if (ballSlowTimer <= 0) {
    return;
  }
  ballSlowTimer = Math.max(0, ballSlowTimer - deltaTime);
  if (ballSlowTimer === 0) {
    ball.vx /= BALL_SLOW_FACTOR;
    ball.vy /= BALL_SLOW_FACTOR;
  }
}

function updateParticles(deltaTime) {
  const stepScale = deltaTime / STEP;
  for (const particle of particles) {
    particle.x += particle.vx * stepScale;
    particle.y += particle.vy * stepScale;
    particle.vy += 0.08 * stepScale;
    particle.life -= deltaTime;
  }
  particles = particles.filter((particle) => particle.life > 0);
}

function spawnBrickParticles(brick) {
  if (!particlesEnabled) {
    return;
  }

  const colors = ["#ff765e", "#ffb454", "#f3d56c", "#71d4bd"];
  const color = brick.type === "shooter"
    ? "#f05b70"
    : brick.type === "projectile"
      ? "#65d5e8"
      : brick.type === "jackpot"
        ? "#f3d45b"
        : brick.type === "bomb"
          ? "#fa6658"
      : brick.type === "heart"
        ? "#f05b78"
        : brick.type === "grow"
          ? "#55cbb2"
          : brick.type === "slow"
            ? "#789be8"
            : brick.type === "giant"
              ? "#f29b55"
      : colors[brick.row % colors.length];

  for (let index = 0; index < 12; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.8;
    const maxLife = 320 + Math.random() * 300;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 2.5,
      color,
      life: maxLife,
      maxLife
    });
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function movePaddle() {
  const movementSpeed = paddle.speed * (paddleSlowTimer > 0 ? PADDLE_SLOW_FACTOR : 1);
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x = paddle.x - movementSpeed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x = paddle.x + movementSpeed;
  }

  // Keep the paddle on the screen.
  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveBall() {
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}


// ------------------------------------------------------------
// DRAW: paints everything on the canvas. Black background,
// white shapes.
// ------------------------------------------------------------
function draw() {
  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#101d2c");
  background.addColorStop(1, "#172a38");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#b7c8d4";
  ctx.font = "bold 12px Trebuchet MS, sans-serif";
  ctx.fillText(`SCORE  ${score}`, 18, 25);
  ctx.textAlign = "center";
  const modeLabel = gameMode === "endless" ? `ENDLESS ${wave}` : `LEVEL ${wave}/${CAMPAIGN_LEVELS}`;
  ctx.fillText(modeLabel, WIDTH / 2, 25);
  ctx.textAlign = "right";
  ctx.fillText(`LIVES  ${lives}   BRICKS  ${bricks.length}`, WIDTH - 18, 25);
  ctx.textAlign = "left";
  if (aimCooldown > 0) {
    ctx.textAlign = "center";
    ctx.fillText(`AIM ${Math.ceil(aimCooldown / 1000)}s`, WIDTH / 2, 43);
    ctx.textAlign = "left";
  }
  if (paddleGrowTimer > 0) {
    ctx.fillStyle = "#a5f3e7";
    ctx.fillText(`WIDE ${Math.ceil(paddleGrowTimer / 1000)}s`, 18, 43);
  }
  if (ballSlowTimer > 0) {
    ctx.fillStyle = "#b8ccff";
    ctx.textAlign = "right";
    ctx.fillText(`SLOW ${Math.ceil(ballSlowTimer / 1000)}s`, WIDTH - 18, 43);
    ctx.textAlign = "left";
  }

  drawBricks();  // bricks.js
  drawBrickWeapons();  // bricks.js
  drawParticles();

  if (selectedTarget && bricks.includes(selectedTarget)) {
    ctx.strokeStyle = "#fff4c2";
    ctx.lineWidth = 2;
    ctx.strokeRect(selectedTarget.x - 2, selectedTarget.y - 2, selectedTarget.width + 4, selectedTarget.height + 4);
  }

  const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  paddleGradient.addColorStop(0, "#a5f3e7");
  paddleGradient.addColorStop(1, "#36b7ad");
  ctx.fillStyle = paddleGradient;
  fillRoundedRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);

  ctx.fillStyle = "#fff4c2";
  ctx.shadowColor = "#ffcc66";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

}

function startNextWave() {
  if (gameMode === "campaign" && wave >= CAMPAIGN_LEVELS) {
    clearCampaignSave();
    document.getElementById("victory-score").textContent = `Final score: ${score}`;
    showScreen("victory");
    return;
  }
  wave++;
  ballSpeed = BALL_SPEED * speedSetting + Math.min(wave - 1, 10) * 0.4;
  bricks = makeBricks(wave);
  brickBeam = null;
  projectiles = [];
  selectedTarget = null;
  beamCooldown = Math.max(900, 1800 - (wave - 1) * 60);
  paddle.x = WIDTH / 2 - paddle.width / 2;
  resetBall();
  showScreen("ready");
  saveCampaign();
}


// ------------------------------------------------------------
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw.
// Some screens are faster than others, so we make sure update()
// always runs exactly 60 times per second on every computer.
// ------------------------------------------------------------
const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover = leftover + (now - lastTime);
  lastTime = now;

  // If the tab was hidden for a while, don't try to catch up.
  if (leftover > 250) {
    leftover = 250;
  }

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  if (gameMode === "campaign" && now - lastCampaignSave >= 1000) {
    saveCampaign();
    lastCampaignSave = now;
  }

  draw();
  requestAnimationFrame(frame);
}

function showScreen(state) {
  gameState = state;
  const screen = state === "paused" ? "pause" : state;
  for (const name of ["menu", "ready", "settings", "pause", "gameover", "victory"]) {
    document.getElementById(`screen-${name}`).hidden = name !== screen;
  }
}

function loadCampaignSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    if (saved?.version !== 1 || saved.wave < 1 || saved.wave > CAMPAIGN_LEVELS ||
      !Array.isArray(saved.bricks) || !saved.ball || !saved.paddle) {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function saveCampaign() {
  if (gameMode !== "campaign" || ["menu", "gameover", "victory"].includes(gameState)) {
    return;
  }

  const beamSave = brickBeam
    ? { ...brickBeam, sourceIndex: bricks.indexOf(brickBeam.source), source: undefined }
    : null;
  const saved = {
    version: 1,
    wave,
    score,
    lives,
    speedSetting,
    bricks,
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    paddle: { x: paddle.x, width: paddle.width },
    selectedTargetIndex: bricks.indexOf(selectedTarget),
    aimCooldown,
    paddleGrowTimer,
    paddleSlowTimer,
    ballSlowTimer,
    resumeState: gameState === "playing" ? "playing" : "ready",
    projectiles,
    brickBeam: beamSave,
    beamCooldown
  };

  try {
    localStorage.setItem(CAMPAIGN_SAVE_KEY, JSON.stringify(saved));
    document.getElementById("continue-button").hidden = false;
  } catch {
    return;
  }
}

function clearCampaignSave() {
  try {
    localStorage.removeItem(CAMPAIGN_SAVE_KEY);
    document.getElementById("continue-button").hidden = true;
  } catch {
    return;
  }
}

function startGame(mode = "campaign", saved = null) {
  initializeAudio();
  gameMode = mode;
  if (mode === "campaign" && saved) {
    wave = saved.wave;
    score = saved.score;
    lives = saved.lives;
    speedSetting = saved.speedSetting || speedSetting;
    ballSpeed = BALL_SPEED * speedSetting + Math.min(wave - 1, 10) * 0.4;
    bricks = saved.bricks;
    ball.x = saved.ball.x;
    ball.y = saved.ball.y;
    ball.vx = saved.ball.vx;
    ball.vy = saved.ball.vy;
    paddle.x = saved.paddle.x;
    paddle.width = saved.paddle.width;
    selectedTarget = bricks[saved.selectedTargetIndex] || null;
    aimCooldown = saved.aimCooldown || 0;
    paddleGrowTimer = saved.paddleGrowTimer || 0;
    paddleSlowTimer = saved.paddleSlowTimer || 0;
    ballSlowTimer = saved.ballSlowTimer || 0;
    projectiles = saved.projectiles || [];
    beamCooldown = saved.beamCooldown || 1200;
    if (saved.brickBeam) {
      const { sourceIndex, ...beamState } = saved.brickBeam;
      brickBeam = { ...beamState, source: bricks[sourceIndex] || null };
    } else {
      brickBeam = null;
    }
  } else {
    wave = 1;
    ballSpeed = BALL_SPEED * speedSetting;
    bricks = makeBricks(wave);  // bricks.js
    score = 0;
    lives = 3;
    selectedTarget = null;
    aimCooldown = 0;
    paddle.width = PADDLE_BASE_WIDTH;
    paddleGrowTimer = 0;
    paddleSlowTimer = 0;
    ballSlowTimer = 0;
    brickBeam = null;
    projectiles = [];
    beamCooldown = 1800;
    paddle.x = WIDTH / 2 - paddle.width / 2;
    resetBall();
  }
  particles = [];
  lastTime = performance.now();
  showScreen(saved && mode === "campaign" && saved.resumeState === "playing" ? "playing" : "ready");
  if (mode === "campaign") {
    saveCampaign();
  }
}

let settingsReturnState = "menu";
document.getElementById("campaign-button").addEventListener("click", () => startGame("campaign"));
document.getElementById("endless-button").addEventListener("click", () => startGame("endless"));
document.getElementById("continue-button").addEventListener("click", () => {
  const saved = loadCampaignSave();
  if (saved) startGame("campaign", saved);
});
document.getElementById("restart-button").addEventListener("click", () => startGame(gameMode || "campaign"));
document.getElementById("launch-button").addEventListener("click", launchBall);
document.getElementById("resume-button").addEventListener("click", () => showScreen(pausedState));
document.getElementById("pause-button").addEventListener("click", () => {
  if (gameState === "playing" || gameState === "ready") {
    pausedState = gameState;
    showScreen("paused");
  }
});
document.getElementById("open-settings").addEventListener("click", () => {
  settingsReturnState = "menu";
  showScreen("settings");
});
document.getElementById("pause-settings").addEventListener("click", () => {
  settingsReturnState = "paused";
  showScreen("settings");
});
document.getElementById("settings-back").addEventListener("click", () => showScreen(settingsReturnState));
document.getElementById("menu-button").addEventListener("click", () => {
  saveCampaign();
  showScreen("menu");
});
document.getElementById("gameover-menu").addEventListener("click", () => showScreen("menu"));
document.getElementById("victory-endless").addEventListener("click", () => startGame("endless"));
document.getElementById("victory-menu").addEventListener("click", () => showScreen("menu"));
document.getElementById("effects-toggle").addEventListener("change", (event) => {
  particlesEnabled = event.target.checked;
  if (!particlesEnabled) particles = [];
});
document.getElementById("sound-toggle").addEventListener("change", (event) => {
  soundEnabled = event.target.checked;
  if (soundEnabled) initializeAudio();
});
document.getElementById("speed-select").addEventListener("change", (event) => {
  speedSetting = Number(event.target.value);
  ballSpeed = BALL_SPEED * speedSetting + Math.max(wave - 1, 0) * 0.4;
});
document.getElementById("continue-button").hidden = !loadCampaignSave();
window.addEventListener("pagehide", saveCampaign);

// Start only after bricks.js and collisions.js have finished loading.
window.addEventListener("load", function () {
  bricks = makeBricks(wave);
  resetBall();
  requestAnimationFrame(frame);
});

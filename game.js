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
let ballSpeed = BALL_SPEED;

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
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.vx = ballSpeed;  // right
  ball.vy = ballSpeed;  // down
}


// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6
};
const AIM_RANGE = 180;


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];
let score = 0;
let wave = 1;
let lives = 3;
let gameOver = false;
let selectedTarget = null;


// ------------------------------------------------------------
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ------------------------------------------------------------
const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (gameOver && key === "r") {
    start();
  }
  // Stop the arrow keys from scrolling the page.
  if (event.key.startsWith("Arrow")) {
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
  if (gameOver) {
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
  } else {
    selectedTarget = null;
  }
});


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (gameOver) {
    return;
  }

  movePaddle();
  moveBall();

  bounceOffWalls();   // collisions.js
  bounceOffPaddle();  // collisions.js
  bounceOffBricks();  // collisions.js
  updateBrickWeapons(STEP);  // bricks.js

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
  selectedTarget = null;
  if (lives <= 0) {
    gameOver = true;
    return;
  }
  resetBall();
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x = paddle.x - paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x = paddle.x + paddle.speed;
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
  ctx.fillText(`WAVE  ${wave}`, WIDTH / 2, 25);
  ctx.textAlign = "right";
  ctx.fillText(`LIVES  ${lives}   BRICKS  ${bricks.length}`, WIDTH - 18, 25);
  ctx.textAlign = "left";

  drawBricks();  // bricks.js
  drawBrickWeapons();  // bricks.js

  if (selectedTarget && bricks.includes(selectedTarget)) {
    ctx.strokeStyle = "#fff4c2";
    ctx.lineWidth = 2;
    ctx.strokeRect(selectedTarget.x - 2, selectedTarget.y - 2, selectedTarget.width + 4, selectedTarget.height + 4);
  }

  const paddleGradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  paddleGradient.addColorStop(0, "#a5f3e7");
  paddleGradient.addColorStop(1, "#36b7ad");
  ctx.fillStyle = paddleGradient;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
  ctx.fill();

  ctx.fillStyle = "#fff4c2";
  ctx.shadowColor = "#ffcc66";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(ball.x + ball.width / 2, ball.y + ball.height / 2, ball.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (gameOver) {
    ctx.fillStyle = "rgba(5, 12, 18, 0.78)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff4c2";
    ctx.textAlign = "center";
    ctx.font = "bold 30px Trebuchet MS, sans-serif";
    ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 8);
    ctx.font = "16px Trebuchet MS, sans-serif";
    ctx.fillText("Press R to restart", WIDTH / 2, HEIGHT / 2 + 24);
    ctx.textAlign = "left";
  }
}

function startNextWave() {
  wave++;
  ballSpeed = BALL_SPEED + Math.min(wave - 1, 10) * 0.4;
  bricks = makeBricks(wave);
  brickBeam = null;
  projectiles = [];
  selectedTarget = null;
  beamCooldown = Math.max(900, 1800 - (wave - 1) * 60);
  paddle.x = WIDTH / 2 - paddle.width / 2;
  resetBall();
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

  draw();
  requestAnimationFrame(frame);
}

function start() {
  wave = 1;
  ballSpeed = BALL_SPEED;
  bricks = makeBricks(wave);  // bricks.js
  score = 0;
  lives = 3;
  gameOver = false;
  selectedTarget = null;
  brickBeam = null;
  projectiles = [];
  beamCooldown = 1800;
  resetBall();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);

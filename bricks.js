// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 13;
const BRICK_WIDTH = 39;
const BRICK_HEIGHT = 14;
const BRICK_GAP = 5;
const BRICK_ROW_GAP = 4;
const BRICKS_TOP = 50;
const MAX_BRICKS = 250;

function makeBricks(currentWave) {
  const list = [];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;
  const count = Math.min(MAX_BRICKS, 32 + (currentWave - 1) * 14);

  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / BRICK_COLUMNS);
    const col = index % BRICK_COLUMNS;
    const type = currentWave >= 2 && index % 13 === 6
      ? "shooter"
      : currentWave >= 2 && index % 13 === 2
        ? "projectile"
        : currentWave >= 3 && index % 5 === 0
          ? "armored"
          : "normal";

    list.push({
      x: left + col * (BRICK_WIDTH + BRICK_GAP),
      y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_ROW_GAP),
      row,
      type,
      hits: type === "armored" ? 2 : 1,
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT
    });
  }

  return list;
}

function drawBricks() {
  const colors = ["#ff765e", "#ffb454", "#f3d56c", "#71d4bd"];
  for (const brick of bricks) {
    const color = brick.type === "shooter"
      ? "#f05b70"
      : brick.type === "projectile"
        ? "#65d5e8"
        : colors[brick.row % colors.length];
    const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "#263b4a");
    ctx.fillStyle = gradient;
    fillRoundedRect(brick.x, brick.y, brick.width, brick.height, 3);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(brick.x + 4, brick.y + 2, brick.width - 8, 2);

    if (brick.type === "shooter") {
      ctx.fillStyle = "#fff0d1";
      ctx.fillRect(brick.x + brick.width / 2 - 5, brick.y + 6, 10, 3);
    } else if (brick.type === "projectile") {
      ctx.fillStyle = "#e4fbff";
      ctx.beginPath();
      ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (brick.hits > 1) {
      ctx.fillStyle = "#eff4f3";
      ctx.fillRect(brick.x + 7, brick.y + 7, 5, 3);
      ctx.fillRect(brick.x + brick.width - 12, brick.y + 7, 5, 3);
    }
  }
}

let brickBeam = null;
let beamCooldown = 1800;
let projectiles = [];

function spawnBrickProjectiles(brick) {
  for (const offset of [-12, 0, 12]) {
    projectiles.push({
      x: brick.x + brick.width / 2 + offset,
      y: brick.y + brick.height,
      radius: 4,
      speed: 2.6,
      slowTimer: 0,
      touchingPaddle: false
    });
  }
}

function updateBrickWeapons(deltaTime) {
  updateBrickProjectiles(deltaTime);

  if (brickBeam) {
    brickBeam.timer -= deltaTime;
    if (brickBeam.state === "charging") {
      if (!bricks.includes(brickBeam.source)) {
        brickBeam = null;
        return;
      }
      if (brickBeam.timer <= 0) {
        brickBeam.state = "firing";
        brickBeam.timer = 420;
      }
    } else {
      if (!brickBeam.hitPaddle && boxesTouch(paddle, brickBeam)) {
        brickBeam.hitPaddle = true;
        loseLife();
      }
      if (brickBeam.timer <= 0) {
        brickBeam = null;
        beamCooldown = Math.max(1100, 3200 - (wave - 1) * 100);
      }
    }
    return;
  }

  beamCooldown -= deltaTime;
  if (beamCooldown > 0) {
    return;
  }

  const shooters = bricks.filter((brick) => brick.type === "shooter");
  if (shooters.length === 0) {
    return;
  }
  const source = shooters[Math.floor(Math.random() * shooters.length)];

  const width = 92;
  const x = Math.max(0, Math.min(WIDTH - width, source.x + source.width / 2 - width / 2));
  brickBeam = {
    x,
    y: source.y + source.height,
    width,
    height: HEIGHT - source.y - source.height,
    source,
    state: "charging",
    timer: 720,
    hitPaddle: false
  };
}

function updateBrickProjectiles(deltaTime) {
  const stepScale = deltaTime / STEP;
  for (const projectile of projectiles) {
    if (projectile.slowTimer > 0) {
      projectile.slowTimer = Math.max(0, projectile.slowTimer - deltaTime);
    }
    const speed = projectile.speed * (projectile.slowTimer > 0 ? 0.35 : 1);
    projectile.y += speed * stepScale;

    const touchesPaddle =
      projectile.x + projectile.radius > paddle.x &&
      projectile.x - projectile.radius < paddle.x + paddle.width &&
      projectile.y + projectile.radius > paddle.y &&
      projectile.y - projectile.radius < paddle.y + paddle.height;
    if (touchesPaddle && !projectile.touchingPaddle) {
      projectile.slowTimer = 1600;
    }
    projectile.touchingPaddle = touchesPaddle;
  }
  projectiles = projectiles.filter((projectile) => projectile.y - projectile.radius <= HEIGHT);
}

function drawBrickWeapons() {
  for (const projectile of projectiles) {
    ctx.fillStyle = projectile.slowTimer > 0 ? "#b5f4ff" : "#53cde2";
    ctx.shadowColor = "#53cde2";
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  if (!brickBeam) {
    return;
  }

  ctx.save();
  if (brickBeam.state === "charging") {
    ctx.fillStyle = "rgba(255, 184, 94, 0.10)";
    ctx.fillRect(brickBeam.x, brickBeam.y, brickBeam.width, brickBeam.height);
    ctx.strokeStyle = "rgba(255, 202, 122, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.strokeRect(brickBeam.x + 1, brickBeam.y, brickBeam.width - 2, brickBeam.height);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = "rgba(255, 75, 91, 0.34)";
    ctx.fillRect(brickBeam.x, brickBeam.y, brickBeam.width, brickBeam.height);
    ctx.fillStyle = "rgba(255, 184, 145, 0.8)";
    ctx.fillRect(brickBeam.x + brickBeam.width / 2 - 3, brickBeam.y, 6, brickBeam.height);
  }
  ctx.restore();
}

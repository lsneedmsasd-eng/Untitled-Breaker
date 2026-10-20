// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 16;
const BRICK_WIDTH = 48;
const BRICK_HEIGHT = 18;
const BRICK_GAP = 6;
const BRICK_ROW_GAP = 4;
const BRICKS_TOP = 50;
const MAX_BRICKS = 250;
const MAX_LASER_BLOCKS = 2;

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[otherIndex]] = [items[otherIndex], items[index]];
  }
  return items;
}

function makeBricks(currentWave) {
  const list = [];
  let shooterCount = 0;
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;
  const desiredCount = Math.min(MAX_BRICKS, 32 + (currentWave - 1) * 14);
  const maxFullRows = Math.floor(MAX_BRICKS / BRICK_COLUMNS) * BRICK_COLUMNS;
  const rowCount = Math.min(maxFullRows / BRICK_COLUMNS, Math.ceil(desiredCount / BRICK_COLUMNS));
  const giantTarget = currentWave >= 5 ? 3 : currentWave >= 3 ? 2 : 1;
  const cells = Array.from({ length: rowCount * BRICK_COLUMNS }, (_, index) => index);
  const giantAnchors = shuffle(cells.filter((cell) =>
    cell % BRICK_COLUMNS < BRICK_COLUMNS - 1 &&
    Math.floor(cell / BRICK_COLUMNS) < rowCount - 1
  ));
  const occupiedCells = new Set();

  for (const anchor of giantAnchors) {
    const coveredCells = [anchor, anchor + 1, anchor + BRICK_COLUMNS, anchor + BRICK_COLUMNS + 1];
    if (coveredCells.some((cell) => occupiedCells.has(cell))) {
      continue;
    }
    const row = Math.floor(anchor / BRICK_COLUMNS);
    const col = anchor % BRICK_COLUMNS;
    list.push({
      x: left + col * (BRICK_WIDTH + BRICK_GAP),
      y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_ROW_GAP),
      row,
      type: "giant",
      hits: 4,
      width: BRICK_WIDTH * 2 + BRICK_GAP,
      height: BRICK_HEIGHT * 2 + BRICK_ROW_GAP
    });
    for (const cell of coveredCells) {
      occupiedCells.add(cell);
    }
    if (list.length === giantTarget) {
      break;
    }
  }

  for (const index of cells) {
    if (occupiedCells.has(index)) {
      continue;
    }
    const row = Math.floor(index / BRICK_COLUMNS);
    const col = index % BRICK_COLUMNS;
    const roll = Math.random();
    let type = "normal";
    if (roll < 0.04) {
      type = "heart";
    } else if (roll < 0.08) {
      type = "grow";
    } else if (roll < 0.12) {
      type = "jackpot";
    } else if (roll < 0.16) {
      type = "slow";
    } else if (roll < 0.20) {
      type = "bomb";
    } else if (roll < 0.24) {
      type = "poison";
    } else if (currentWave >= 2 && roll < 0.32) {
      type = "projectile";
    } else if (currentWave >= 10 && shooterCount < MAX_LASER_BLOCKS && roll < 0.36) {
      type = "shooter";
    } else if (currentWave >= 3 && roll < 0.56) {
      type = "armored";
    }

    if (type === "shooter") {
      shooterCount++;
    }
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
    const color = brick.type === "heart"
      ? "#f05b78"
      : brick.type === "grow"
        ? "#55cbb2"
        : brick.type === "jackpot"
          ? "#f3d45b"
          : brick.type === "bomb"
            ? "#fa6658"
            : brick.type === "poison"
              ? "#b6f45b"
        : brick.type === "slow"
          ? "#789be8"
          : brick.type === "giant"
            ? "#f29b55"
        : brick.type === "shooter"
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
    } else if (["heart", "grow", "slow", "giant", "jackpot", "bomb", "poison"].includes(brick.type)) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = brick.type === "slow" ? "8px sans-serif" : "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const symbol = brick.type === "heart" ? "♥" : brick.type === "grow" ? "↔" : brick.type === "slow" ? "SLOW" : brick.type === "giant" ? "4" : brick.type === "jackpot" ? "+100" : brick.type === "poison" ? "✦" : "✹";
      ctx.fillText(symbol, brick.x + brick.width / 2, brick.y + brick.height / 2);
      ctx.restore();
    } else if (brick.hits > 1) {
      ctx.fillStyle = "#eff4f3";
      ctx.fillRect(brick.x + 7, brick.y + 7, 5, 3);
      ctx.fillRect(brick.x + brick.width - 12, brick.y + 7, 5, 3);
    }
  }
}

let brickBeam = null;
const LASER_WIDTH = 34;
const LASER_CHARGE_DURATION = 1360;
const LASER_FIRE_DURATION = 280;
let beamCooldown = 1200;
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

  if (wave < 10) {
    brickBeam = null;
    return;
  }

  if (brickBeam) {
    brickBeam.timer -= deltaTime;
    if (brickBeam.state === "charging") {
      if (!bricks.includes(brickBeam.source)) {
        brickBeam = null;
        return;
      }
      if (brickBeam.timer <= 0) {
        brickBeam.state = "firing";
        brickBeam.timer = LASER_FIRE_DURATION;
      }
    } else {
      if (!brickBeam.hitPaddle && boxesTouch(paddle, brickBeam)) {
        brickBeam.hitPaddle = true;
        loseLife();
      }
      if (brickBeam.timer <= 0) {
        brickBeam = null;
        beamCooldown = Math.max(750, 2200 - (wave - 1) * 100);
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

  const width = LASER_WIDTH;
  const x = Math.max(0, Math.min(WIDTH - width, source.x + source.width / 2 - width / 2));
  brickBeam = {
    x,
    y: source.y + source.height,
    width,
    height: HEIGHT - source.y - source.height,
    source,
    state: "charging",
    timer: LASER_CHARGE_DURATION,
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
      slowPaddle();
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
    const chargeProgress = 1 - brickBeam.timer / LASER_CHARGE_DURATION;
    const pulse = 0.08 + (0.12 + chargeProgress * 0.22) * (0.5 + 0.5 * Math.sin(brickBeam.timer * 0.035));
    ctx.fillStyle = `rgba(255, 184, 94, ${pulse})`;
    ctx.fillRect(brickBeam.x, brickBeam.y, brickBeam.width, brickBeam.height);
    ctx.strokeStyle = `rgba(255, 202, 122, ${0.5 + chargeProgress * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.lineDashOffset = brickBeam.timer * 0.025;
    ctx.strokeRect(brickBeam.x + 1, brickBeam.y, brickBeam.width - 2, brickBeam.height);
    ctx.setLineDash([]);
  } else {
    const fireProgress = 1 - brickBeam.timer / LASER_FIRE_DURATION;
    const pulse = 0.28 + 0.18 * (0.5 + 0.5 * Math.sin(brickBeam.timer * 0.08));
    ctx.fillStyle = `rgba(255, 75, 91, ${pulse})`;
    ctx.fillRect(brickBeam.x, brickBeam.y, brickBeam.width, brickBeam.height);
    ctx.fillStyle = "rgba(255, 184, 145, 0.88)";
    ctx.fillRect(brickBeam.x + brickBeam.width / 2 - 2, brickBeam.y, 4, brickBeam.height);
    const flareY = brickBeam.y + (brickBeam.height - 22) * fireProgress;
    ctx.fillStyle = "rgba(255, 245, 220, 0.95)";
    ctx.fillRect(brickBeam.x - 3, flareY, brickBeam.width + 6, 22);
  }
  ctx.restore();
}

let z = 1;
let running = false;
let animationId = null;
let frame = 0;
let score = 0;
let obstacles = [];
let messageTimeout;
let openPanelId = null;

const BOOT_MS = 3200;
const GROUND_Y = 110;
const JUMP_VELOCITY = -12;
const GRAVITY = 0.8;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const student = {
  x: 40,
  y: GROUND_Y,
  w: 32,
  h: 32,
  vy: 0,
  jumping: false
};

// Scrollable background
const bg = {
  x: 0,
  speed: 2
};

// Load images
const images = {};

function loadImages(callback) {
  const toLoad = ["student", "exam", "assignment", "lab", "background"];
  let settled = 0;

  const done = () => {
    settled++;
    if (settled === toLoad.length) callback();
  };

  toLoad.forEach(name => {
    const img = new Image();
    img.onload = () => {
      images[name] = img;
      done();
    };
    img.onerror = done; // missing asset falls back to a solid rectangle
    img.src = `assets/${name}.png`;
  });
}

// Show message popup
function showMessage(text, time = 2000) {
  const bar = document.getElementById("message-bar");
  clearTimeout(messageTimeout);
  bar.textContent = text;
  bar.style.display = "block";
  messageTimeout = setTimeout(() => {
    bar.style.display = "none";
  }, time);
}

// Open / close panels
function openPanel(id) {
  document.querySelectorAll('.panel').forEach(p => {
    p.style.display = 'none';
  });
  const panel = document.getElementById(id);
  panel.style.display = 'block';
  panel.style.zIndex = ++z;
  openPanelId = id;
}

function closePanel(id) {
  document.getElementById(id).style.display = 'none';
  if (openPanelId === id) openPanelId = null;
  if (id === 'game-window') stopGame();
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && openPanelId) closePanel(openPanelId);
});

// Start the game
window.startGame = function () {
  cancelAnimationFrame(animationId);
  obstacles = [];
  frame = 0;
  score = 0;
  running = true;
  student.y = GROUND_Y;
  student.vy = 0;
  student.jumping = false;
  bg.x = 0;
  showMessage("📖 Semester Started!");
  loop();
};

function stopGame() {
  running = false;
  cancelAnimationFrame(animationId);
}

// Quit game
window.quitGame = function () {
  stopGame();
  showMessage("💾 Game Closed");
  document.getElementById('game-window').style.display = 'none';
  if (openPanelId === 'game-window') openPanelId = null;
};

function gameOver() {
  stopGame();
  showMessage(`❌ Semester Failed! Credits: ${score}`, 3000);

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "14px monospace";
  ctx.fillText("SEMESTER FAILED", canvas.width / 2, canvas.height / 2 - 8);
  ctx.font = "10px monospace";
  ctx.fillText(`CREDITS: ${score} — PRESS START TO RETRY`, canvas.width / 2, canvas.height / 2 + 12);
  ctx.textAlign = "left";
}

function jump() {
  if (!running || student.jumping) return;
  student.vy = JUMP_VELOCITY;
  student.jumping = true;
}

// Jump on spacebar
document.addEventListener("keydown", e => {
  if (e.code === "Space" && running) {
    e.preventDefault();
    jump();
  }
});

// Jump on left click inside the game screen only
canvas.addEventListener("mousedown", e => {
  if (e.button === 0) jump();
});

// Spawn obstacles
function spawnObstacle() {
  const types = ["exam", "assignment", "lab"];
  const type = types[Math.floor(Math.random() * types.length)];
  obstacles.push({
    x: canvas.width,
    y: 120,
    w: 32,
    h: 32,
    type: type
  });
}

// Game loop
function loop() {
  if (!running) return;

  frame++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Background scroll ---
  if (images.background) {
    bg.x -= bg.speed;
    if (bg.x <= -canvas.width) bg.x = 0;
    ctx.drawImage(images.background, bg.x, 0, canvas.width, canvas.height);
    ctx.drawImage(images.background, bg.x + canvas.width, 0, canvas.width, canvas.height);
  }

  // --- Student physics ---
  student.vy += GRAVITY;
  student.y += student.vy;
  if (student.y >= GROUND_Y) {
    student.y = GROUND_Y;
    student.vy = 0;
    student.jumping = false;
  }

  // Draw student sprite
  if (images.student) {
    ctx.drawImage(images.student, student.x, student.y, student.w, student.h);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(student.x, student.y, student.w, student.h);
  }

  // --- Obstacles ---
  if (frame % 90 === 0) spawnObstacle();

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.x -= bg.speed + 2; // move faster than background

    // Draw obstacle image
    if (images[o.type]) {
      ctx.drawImage(images[o.type], o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = "#800000";
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }

    // Collision
    if (
      student.x < o.x + o.w &&
      student.x + student.w > o.x &&
      student.y < o.y + o.h &&
      student.y + student.h > o.y
    ) {
      gameOver();
      return;
    }

    // Remove offscreen
    if (o.x + o.w < 0) {
      obstacles.splice(i, 1);
      score++;
      showMessage("✅ Task Survived!", 800);
    }
  }

  // --- HUD ---
  ctx.font = "10px monospace";
  ctx.fillStyle = "#000";
  ctx.fillText("Credits: " + score, 10, 14);

  animationId = requestAnimationFrame(loop);
}

// --- Load all images first ---
loadImages(() => {
  console.log("Game images ready!");
});

const messages = [
  "📖 More Assignment Posted 😫!",
  "💻 Lab Deadline Approaching 😖!",
  "☕ Coffee Break Time!",
  "🎮 Mini Game Available!"
];

function randomPopup() {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  showMessage(msg, 1500);
  setTimeout(randomPopup, 5000 + Math.random() * 5000); // 5-10s random interval
}

// Wait for the boot screen to clear before nagging the visitor
setTimeout(randomPopup, BOOT_MS);

const visualStage = document.getElementById('visual-stage');

function createSparkle() {
  if (!visualStage.offsetWidth) return; // stage hidden on small screens

  const sparkle = document.createElement('div');
  sparkle.className = 'sparkle';
  sparkle.style.left = Math.random() * (visualStage.offsetWidth - 4) + 'px';
  sparkle.style.top = Math.random() * (visualStage.offsetHeight - 4) + 'px';
  sparkle.addEventListener('animationend', () => sparkle.remove());
  visualStage.appendChild(sparkle);
}

setInterval(createSparkle, 300);

const pet = document.getElementById('pet');
let petX = 100;
let petY = 100;
const petSpeed = 1.5;

pet.addEventListener('click', () => showMessage("👋 Give me 5 marks as compensation!"));

const topPanel = document.getElementById('top-panel');

// Panel sizing depends on the header, which grows when the nav wraps
function syncHeaderHeight() {
  document.documentElement.style.setProperty('--header-h', topPanel.offsetHeight + 'px');
}

syncHeaderHeight();
window.addEventListener('load', syncHeaderHeight); // web fonts can change the header height

// Choose a random target position, keeping the pet clear of the top panel
function getRandomTarget() {
  const topPanelHeight = topPanel.offsetHeight;
  const x = Math.random() * Math.max(window.innerWidth - 32, 0);
  const y = topPanelHeight + Math.random() * Math.max(window.innerHeight - topPanelHeight - 32, 0);
  return { x, y };
}

let target = getRandomTarget();

function moveAxis(current, goal) {
  if (Math.abs(goal - current) < petSpeed) return goal;
  return current < goal ? current + petSpeed : current - petSpeed;
}

// Animate pet towards target
function animatePet() {
  petX = moveAxis(petX, target.x);
  petY = moveAxis(petY, target.y);

  pet.style.left = petX + 'px';
  pet.style.top = petY + 'px';

  if (petX === target.x && petY === target.y) {
    target = getRandomTarget();
  }

  requestAnimationFrame(animatePet);
}

// Start roaming
animatePet();

window.addEventListener('resize', () => {
  syncHeaderHeight();
  target = getRandomTarget();
});

let z = 1;
let running = false;
let animationId = null;
let frame = 0;
let score = 0;
let obstacles = [];
let messageTimeout;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const student = {
  x: 40,
  y: 110,
  w: 32,
  h: 32,
  vy: 0,
  jumping: false
};

// Scrollable background
const bg = {
  x: 0,
  speed: 2,
  img: null
};

// Load images
const images = {};

function loadImages(callback) {
  const toLoad = ["student", "exam", "assignment", "lab", "background"];
  let loaded = 0;

  toLoad.forEach(name => {
    const img = new Image();
    img.src = `assets/${name}.png`; // Make sure these exist
    img.onload = () => {
      images[name] = img;
      loaded++;
      if (loaded === toLoad.length) callback();
    };
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
}

function closePanel(id) {
  document.getElementById(id).style.display = 'none';
}

// Start the game
window.startGame = function () {
  if (running) return;
  obstacles = [];
  frame = 0;
  score = 0;
  running = true;
  student.y = 110;
  student.vy = 0;
  bg.x = 0;
  bg.speed = 2;
  showMessage("📖 Semester Started!");
  loop();
};

// Quit game
window.quitGame = function () {
  running = false;
  cancelAnimationFrame(animationId);
  showMessage("💾 Game Closed");
  document.getElementById('game-window').style.display = 'none';
};

// Jump
// Jump on spacebar
document.addEventListener("keydown", e => {
  if (e.code === "Space" && !student.jumping && running) {
    student.vy = -12;
    student.jumping = true;
  }
});

// Jump on left mouse click
document.addEventListener("mousedown", e => {
  if (e.button === 0 && !student.jumping && running) { // 0 = left button
    student.vy = -12;
    student.jumping = true;
  }
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
  student.vy += 0.8;
  student.y += student.vy;
  if (student.y >= 110) {
    student.y = 110;
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

  obstacles.forEach((o, i) => {
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
      running = false;
      showMessage("❌ Semester Failed!");
    }

    // Remove offscreen
    if (o.x + o.w < 0) {
      obstacles.splice(i, 1);
      score++;
      showMessage("✅ Task Survived!", 800);
    }
  });

  // --- HUD ---
  ctx.font = "10px monospace";
  ctx.fillStyle = "#000";
  ctx.fillText("Credits: " + score, 10, 14);

  animationId = requestAnimationFrame(loop);
}

// --- Load all images first ---
loadImages(() => {
  console.log("All game images loaded!");
});

const messages = [
  "📖 More Assignment Posted 😫!",
  "💻 Lab Deadline Approaching 😖!",
  "☕ Coffee Break Time!",
  "🎮 Mini Game Available!"
];

function randomPopup() {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  showMessage(msg, 1500); // reuse your existing message bar
  setTimeout(randomPopup, 5000 + Math.random()*5000); // 5-10s random interval
}

randomPopup();

const visualStage = document.getElementById('visual-stage');

function createSparkle() {
  const sparkle = document.createElement('div');
  sparkle.style.position = 'absolute';
  sparkle.style.width = '4px';
  sparkle.style.height = '4px';
  sparkle.style.background = '#FFD700';
  sparkle.style.borderRadius = '50%';
  sparkle.style.left = Math.random() * (visualStage.offsetWidth - 4) + 'px';
  sparkle.style.top = Math.random() * (visualStage.offsetHeight - 4) + 'px';
  visualStage.appendChild(sparkle);

  setTimeout(() => sparkle.remove(), 1000); // fade after 1s
}

// continuously spawn sparkles
setInterval(createSparkle, 300);

const pet = document.getElementById('pet');
let petX = 100; // initial position
let petY = 100;
let petSpeed = 1.5;

// Choose a random target position within window
function getRandomTarget() {
  const x = Math.random() * (window.innerWidth - 32);
  const y = Math.random() * (window.innerHeight - 32);
  return {x, y};
}

let target = getRandomTarget();

// Animate pet towards target
function animatePet() {
  // Move X
  if (Math.abs(target.x - petX) < petSpeed) {
    petX = target.x;
  } else if (petX < target.x) {
    petX += petSpeed;
  } else {
    petX -= petSpeed;
  }

  // Move Y
  if (Math.abs(target.y - petY) < petSpeed) {
    petY = target.y;
  } else if (petY < target.y) {
    petY += petSpeed;
  } else {
    petY -= petSpeed;
  }

  // Apply new position
  pet.style.left = petX + 'px';
  pet.style.top = petY + 'px';

  // If reached target, pick a new random target
  if (petX === target.x && petY === target.y) {
    target = getRandomTarget();
  }

  requestAnimationFrame(animatePet);
  pet.addEventListener('click', () => showMessage("👋 Give me 5 marks as compensation!"));

}

// Start roaming
animatePet();

// JavaScript code for the soccer mini-game will go here
console.log('Game script loaded!');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score'); // スコア表示要素を取得
const joystickBase = document.getElementById('joystick-base');
const joystickHandle = document.getElementById('joystick-handle');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');

// --- Game State --- //
let gameState = 'start'; // 'start', 'playing', 'gameOver'
const WINNING_SCORE = 3; // Game over when player reaches this score

// --- Audio --- //
const kickSound = new Audio('kick.wav'); // Assume kick.wav exists
const goalSound = new Audio('goal.wav'); // Assume goal.wav exists
// Optional: Handle loading errors
kickSound.onerror = () => console.error("Error loading kick sound.");
goalSound.onerror = () => console.error("Error loading goal sound.");

// Function to play sound (avoids issues with rapid replays)
function playSound(sound) {
    sound.currentTime = 0; // Rewind to start
    sound.play().catch(error => {
        // Autoplay policy might prevent playing without user interaction first
        console.warn("Sound playback failed, possibly due to autoplay policy:", error);
    });
}

// --- Images --- //
const playerImg = new Image();
const cpuImg = new Image();
const ballImg = new Image();
let imagesLoaded = 0;
const totalImages = 3;

function onImageLoad() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("All images loaded.");
        // Optionally start the game loop only after images load?
        // requestAnimationFrame(gameLoop); // Move loop start here if needed
    }
}

playerImg.onload = onImageLoad;
cpuImg.onload = onImageLoad;
ballImg.onload = onImageLoad;

playerImg.onerror = () => console.error("Error loading player image.");
cpuImg.onerror = () => console.error("Error loading CPU image.");
ballImg.onerror = () => console.error("Error loading ball image.");

playerImg.src = 'player.png'; // Assume player.png exists
cpuImg.src = 'cpu.png';       // Assume cpu.png exists
ballImg.src = 'ball.png';     // Assume ball.png exists

// --- Difficulty Settings --- //
const difficultySettings = {
    easy: { cpuSpeed: 100 },
    medium: { cpuSpeed: 150 },
    hard: { cpuSpeed: 200 }
};
let currentDifficulty = 'medium'; // Can be changed later (e.g., by user input)

// Canvas サイズを設定（CSSで設定したサイズに合わせる）
function resizeCanvas() {
    const style = getComputedStyle(canvas);
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    canvas.width = parseInt(style.width, 10);
    canvas.height = parseInt(style.height, 10);
    console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);

    // オブジェクトの位置を再計算（単純なリセット）
    // TODO: より良い方法（比率で保持するなど）も検討可能
    resetPlayerPosition(); // プレイヤー位置をリセット
    resetCPUPosition();  // CPU位置をリセット
    resetBall();          // ボール位置をリセット（既存の関数を利用）
}

// 初期リサイズとウィンドウリサイズ時の対応
window.addEventListener('resize', resizeCanvas);

// --- Game Loop --- //
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear canvas regardless of state? Or only when playing?
    // Clearing always might be simpler
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game state (only if playing)
    update(deltaTime);

    // Draw current state
    draw();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// --- Game Objects --- //
const player = {
    x: 0, // Initial position set in resetPlayerPosition
    y: 0,
    radius: 15,
    color: 'blue',
    speed: 200 // pixels per second
};

const cpu = {
    x: 0, // Initial position set in resetCPUPosition
    y: 0,
    radius: 15,
    color: 'red',
    speed: difficultySettings[currentDifficulty].cpuSpeed // Apply difficulty
};

const ball = {
    x: 0, // Initial position set in resetBall
    y: 0,
    radius: 10,
    color: 'white',
    vx: 0, // velocity x
    vy: 0, // velocity y
    speed: 300, // max speed
    friction: 0.98 // 摩擦係数 (1に近いほど摩擦が少ない)
};

// --- Game State --- //
let score = 0;

// --- Constants --- //
// ゴールサイズ (drawFieldでの描画と合わせる)
const GOAL_WIDTH_RATIO = 0.3; // canvas height に対する割合
const GOAL_DEPTH = 10; // ゴールの奥行き（線の太さ）

// --- Input Handling --- //
const keysPressed = {};

window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// --- Touch Input Handling (Virtual Joystick) --- //
let isDraggingJoystick = false;
let joystickTouchId = null;
let joystickBaseRect = null;
let joystickBaseCenterX = 0;
let joystickBaseCenterY = 0;
let joystickMaxRadius = 0;
let dx_touch = 0; // Joystick X output (-1 to 1)
let dy_touch = 0; // Joystick Y output (-1 to 1)

// Helper function to get touch position relative to an element
function getTouchPos(element, touch) {
    const rect = element.getBoundingClientRect();
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

// Initial setup for joystick dimensions
function setupJoystick() {
    joystickBaseRect = joystickBase.getBoundingClientRect();
    joystickBaseCenterX = joystickBaseRect.width / 2;
    joystickBaseCenterY = joystickBaseRect.height / 2;
    joystickMaxRadius = joystickBaseRect.width / 2 - joystickHandle.offsetWidth / 2; // Max radius handle can move
    // Reset handle position initially
    joystickHandle.style.left = `${joystickBaseCenterX - joystickHandle.offsetWidth / 2}px`;
    joystickHandle.style.top = `${joystickBaseCenterY - joystickHandle.offsetHeight / 2}px`;
}

// Call setup initially and on resize
window.addEventListener('resize', setupJoystick);

// Remove previous simple touch listeners from canvas
// canvas.removeEventListener(...)
// canvas.removeEventListener(...)
// canvas.removeEventListener(...)

joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isDraggingJoystick) return; // Already handling a touch

    const touch = e.changedTouches[0];
    isDraggingJoystick = true;
    joystickTouchId = touch.identifier;
    // Recalculate base center in case of layout shifts
    joystickBaseRect = joystickBase.getBoundingClientRect();
    joystickBaseCenterX = joystickBaseRect.width / 2;
    joystickBaseCenterY = joystickBaseRect.height / 2;
    updateJoystick(touch);
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isDraggingJoystick) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            e.preventDefault(); // Prevent scroll only when moving the joystick
            updateJoystick(touch);
            break;
        }
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isDraggingJoystick) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            resetJoystick();
            break;
        }
    }
});

function updateJoystick(touch) {
    const touchX = touch.clientX - joystickBaseRect.left;
    const touchY = touch.clientY - joystickBaseRect.top;

    let deltaX = touchX - joystickBaseCenterX;
    let deltaY = touchY - joystickBaseCenterY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    let handleX, handleY;

    if (distance > joystickMaxRadius) {
        // Clamp to edge
        handleX = joystickBaseCenterX + Math.cos(angle) * joystickMaxRadius;
        handleY = joystickBaseCenterY + Math.sin(angle) * joystickMaxRadius;
        // Keep input vector normalized
        dx_touch = Math.cos(angle);
        dy_touch = Math.sin(angle);
    } else {
        // Inside radius
        handleX = touchX;
        handleY = touchY;
        // Scale input vector by distance
        dx_touch = deltaX / joystickMaxRadius;
        dy_touch = deltaY / joystickMaxRadius;
    }

    // Position the handle (center based)
    joystickHandle.style.left = `${handleX - joystickHandle.offsetWidth / 2}px`;
    joystickHandle.style.top = `${handleY - joystickHandle.offsetHeight / 2}px`;
}

function resetJoystick() {
    isDraggingJoystick = false;
    joystickTouchId = null;
    joystickHandle.style.left = `${joystickBaseCenterX - joystickHandle.offsetWidth / 2}px`;
    joystickHandle.style.top = `${joystickBaseCenterY - joystickHandle.offsetHeight / 2}px`;
    dx_touch = 0;
    dy_touch = 0;
}

// --- Update Function --- //
function update(deltaTime) {
    // Only update if playing
    if (gameState !== 'playing') return;

    const dt = deltaTime / 1000;

    // Player movement (Keyboard)
    let dx_key = 0;
    let dy_key = 0;
    if (keysPressed['ArrowLeft'] || keysPressed['a']) { dx_key -= 1; }
    if (keysPressed['ArrowRight'] || keysPressed['d']) { dx_key += 1; }
    if (keysPressed['ArrowUp'] || keysPressed['w']) { dy_key -= 1; }
    if (keysPressed['ArrowDown'] || keysPressed['s']) { dy_key += 1; }

    // Player movement (Touch - Joystick output dx_touch, dy_touch are updated by joystick logic)

    // Combine inputs (Prioritize touch if active? Or just add? Add for now)
    let dx = dx_key + dx_touch;
    let dy = dy_key + dy_touch;

    // Normalize diagonal movement
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
        dx = (dx / length);
        dy = (dy / length);
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    // Boundary check
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // CPU movement (Simple: always move towards the ball)
    let cpu_dx = ball.x - cpu.x;
    let cpu_dy = ball.y - cpu.y;

    // Normalize CPU movement vector
    const cpu_dist_to_ball = Math.sqrt(cpu_dx * cpu_dx + cpu_dy * cpu_dy);
    if (cpu_dist_to_ball > 0) { // Avoid division by zero
        cpu_dx = (cpu_dx / cpu_dist_to_ball);
        cpu_dy = (cpu_dy / cpu_dist_to_ball);
    }

    cpu.x += cpu_dx * cpu.speed * dt;
    cpu.y += cpu_dy * cpu.speed * dt;

    // CPU Boundary check
    cpu.x = Math.max(cpu.radius, Math.min(canvas.width - cpu.radius, cpu.x));
    cpu.y = Math.max(cpu.radius, Math.min(canvas.height - cpu.radius, cpu.y));

    // Ball movement
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Apply friction
    ball.vx *= ball.friction;
    ball.vy *= ball.friction;

    // Stop ball if velocity is very low
    if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.1) ball.vy = 0;

    // Ball boundary collision (walls)
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx *= -0.8; // Reflect and reduce speed
    } else if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx *= -0.8; // Reflect and reduce speed
    }

    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.8; // Reflect and reduce speed
    } else if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy *= -0.8; // Reflect and reduce speed
    }

    // Player-Ball collision detection
    const dx_pb = ball.x - player.x;
    const dy_pb = ball.y - player.y;
    const distance_pb = Math.sqrt(dx_pb * dx_pb + dy_pb * dy_pb);
    const sumOfRadii = player.radius + ball.radius;

    if (distance_pb < sumOfRadii) {
        // Collision occurred
        // 1. Prevent overlap (push ball away slightly)
        const overlap = sumOfRadii - distance_pb;
        const pushX = (dx_pb / distance_pb) * overlap * 0.51; // 0.51 to ensure separation
        const pushY = (dy_pb / distance_pb) * overlap * 0.51;
        ball.x += pushX;
        ball.y += pushY;
        // Optional: push player away too
        // player.x -= pushX;
        // player.y -= pushY;

        // 2. Transfer momentum (kick the ball)
        // Calculate normalized direction vector from player to ball
        const kickAngle = Math.atan2(dy_pb, dx_pb);

        // Give ball velocity based on kick direction and ball's max speed
        // Simple kick: always kick with max speed
        ball.vx = Math.cos(kickAngle) * ball.speed;
        ball.vy = Math.sin(kickAngle) * ball.speed;

        // More advanced kick (consider player speed?)
        // const playerSpeedMagnitude = Math.sqrt(player.vx * player.vx + player.vy * player.vy); // Need player velocity first
        // ball.vx = Math.cos(kickAngle) * (ball.speed + playerSpeedMagnitude * 0.5); // Example
        // ball.vy = Math.sin(kickAngle) * (ball.speed + playerSpeedMagnitude * 0.5);
        playSound(kickSound); // Play kick sound
    }

    // CPU-Ball collision detection
    const dx_cb = ball.x - cpu.x;
    const dy_cb = ball.y - cpu.y;
    const distance_cb = Math.sqrt(dx_cb * dx_cb + dy_cb * dy_cb);
    const sumOfRadii_cb = cpu.radius + ball.radius;

    if (distance_cb < sumOfRadii_cb) {
        // Collision occurred
        const overlap_cb = sumOfRadii_cb - distance_cb;
        const pushX_cb = (dx_cb / distance_cb) * overlap_cb * 0.51;
        const pushY_cb = (dy_cb / distance_cb) * overlap_cb * 0.51;
        ball.x += pushX_cb;
        ball.y += pushY_cb;
        // cpu.x -= pushX_cb;
        // cpu.y -= pushY_cb;

        const kickAngle_cb = Math.atan2(dy_cb, dx_cb);
        ball.vx = Math.cos(kickAngle_cb) * ball.speed; // Use ball's speed for CPU kick too
        ball.vy = Math.sin(kickAngle_cb) * ball.speed;
        playSound(kickSound); // Play kick sound for CPU too
    }

    // Goal detection
    checkGoal();
}

// --- Goal Checking --- //
function checkGoal() {
    const goalWidth = canvas.height * GOAL_WIDTH_RATIO;
    const goalTopY = (canvas.height - goalWidth) / 2;
    const goalBottomY = goalTopY + goalWidth;

    // Check right goal (Player scores)
    if (ball.x + ball.radius > canvas.width - GOAL_DEPTH &&
        ball.y > goalTopY && ball.y < goalBottomY) {
        console.log("Goal scored!");
        score++;
        updateScoreDisplay();
        playSound(goalSound);

        if (score >= WINNING_SCORE) {
            gameOver(); // Player wins
        } else {
            resetBall(); // Continue playing
        }
    }
    // Check left goal (Opponent scores)
    else if (ball.x - ball.radius < GOAL_DEPTH &&
             ball.y > goalTopY && ball.y < goalBottomY) {
        console.log("Goal conceded!");
        // Opponent scores logic can be added here if needed
        // For now, just reset the ball or maybe trigger game over?
        // gameOver(); // Example: CPU scoring ends the game
        playSound(goalSound); // Or a different sound
        resetBall();
    }
}

// --- Game Over --- //
function gameOver() {
    gameState = 'gameOver';
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'flex'; // Show game over screen
    // Optional: Stop any ongoing sounds?
}

// --- Reset Game --- //
function resetGame() {
    score = 0;
    updateScoreDisplay();
    resetPlayerPosition();
    resetCPUPosition();
    resetBall();
    // Ensure joystick is reset if needed
    resetJoystick();
}

// --- Start Game --- //
function startGame() {
    resetGame();
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
}

// --- Event Listeners for Buttons --- //
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame); // Restart also calls startGame

// --- Update Score Display --- //
function updateScoreDisplay() {
    scoreElement.textContent = score;
}

// --- Reset Ball --- //
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 0;
    ball.vy = 0;
    // Optionally give a slight random velocity?
    // ball.vx = (Math.random() - 0.5) * 50;
    // ball.vy = (Math.random() - 0.5) * 50;
}

// --- Draw Function --- //
function draw() {
    // Always draw the field and objects
    drawField();
    drawPlayer();
    drawCPU();
    drawBall();

    // Overlays are handled by HTML/CSS based on gameState
    // No specific drawing needed here for screens
}

// --- Player Drawing --- //
function drawPlayer() {
    if (!playerImg.complete || playerImg.naturalWidth === 0) {
        // Fallback to circle if image not loaded/failed
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    // Draw image centered at player.x, player.y
    // Assuming image size should match diameter (radius * 2)
    const diameter = player.radius * 2;
    ctx.drawImage(playerImg, player.x - player.radius, player.y - player.radius, diameter, diameter);
}

// --- CPU Drawing --- //
function drawCPU() {
    if (!cpuImg.complete || cpuImg.naturalWidth === 0) {
        // Fallback to circle
        ctx.fillStyle = cpu.color;
        ctx.beginPath();
        ctx.arc(cpu.x, cpu.y, cpu.radius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    const diameter = cpu.radius * 2;
    ctx.drawImage(cpuImg, cpu.x - cpu.radius, cpu.y - cpu.radius, diameter, diameter);
}

// --- Ball Drawing --- //
function drawBall() {
    if (!ballImg.complete || ballImg.naturalWidth === 0) {
        // Fallback to circle
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        return;
    }
    const diameter = ball.radius * 2;
    ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, diameter, diameter);
}

// --- Field Drawing --- //
function drawField() {
    // 背景色 (緑)
    ctx.fillStyle = '#66CDAA'; // MediumAquamarine
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // フィールドの線
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    // センターサークル
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // センターライン
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // ゴール（仮：簡単な線で表現） - 定数を使用するように変更
    const goalWidth = canvas.height * GOAL_WIDTH_RATIO;
    // const goalHeight = GOAL_DEPTH; // 線の太さというより奥行き
    ctx.fillStyle = '#ddd'; // ゴールの色
    // 左ゴール
    ctx.fillRect(0, (canvas.height - goalWidth) / 2, GOAL_DEPTH, goalWidth);
    // 右ゴール
    ctx.fillRect(canvas.width - GOAL_DEPTH, (canvas.height - goalWidth) / 2, GOAL_DEPTH, goalWidth);
}

// --- Reset Player Position --- //
function resetPlayerPosition() {
    // 単純に初期位置に戻す（より洗練された方法も可能）
    player.x = canvas.width / 4;
    player.y = canvas.height / 2;
}

// --- Reset CPU Position --- //
function resetCPUPosition() {
    cpu.x = canvas.width * 3 / 4;
    cpu.y = canvas.height / 2;
    // Ensure speed is updated if difficulty changes mid-game (though not implemented yet)
    cpu.speed = difficultySettings[currentDifficulty].cpuSpeed;
}

// Initial setup and first resize call at the very end
// Ensure initial screen visibility is correct
if (gameState === 'start') {
    startScreen.style.display = 'flex';
    gameOverScreen.style.display = 'none';
} else {
    startScreen.style.display = 'none';
    // gameOverScreen visibility handled by gameOver function
}
setupJoystick();
resizeCanvas();
requestAnimationFrame(gameLoop); // Start the loop
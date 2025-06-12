// =============================================
// ゲーム設定
// =============================================
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const PLAYER_SPEED = 5;

const ITEM_WIDTH = 32;
const ITEM_HEIGHT = 32;
const ITEM_SPEED = 3;
const ITEM_COUNT = 5; // アイテムの総数（リンゴと爆弾を合わせた数）

const INITIAL_LIFE = 3;


// =============================================
// DOM要素の取得
// =============================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const lifeEl = document.getElementById('life');


// =============================================
// ゲームの状態
// =============================================
let playerX = (canvas.width - PLAYER_WIDTH) / 2;
const playerY = canvas.height - PLAYER_HEIGHT - 10;
let score = 0;
let life = INITIAL_LIFE;
let rightPressed = false;
let leftPressed = false;
let gameover = false;

// アイテムの配列
const items = [];
for (let i = 0; i < ITEM_COUNT; i++) {
    const isBomb = i % 2 === 1; // 交互にリンゴと爆弾を生成
    items.push({
        x: Math.random() * (canvas.width - ITEM_WIDTH),
        y: -Math.random() * canvas.height, // 初期位置を画面外のランダムな高さに
        type: isBomb ? 'bomb' : 'apple',
        img: new Image()
    });
}


// =============================================
// 画像の読み込み
// =============================================
const playerImg = new Image();
playerImg.src = 'images/player.png';

const appleImg = new Image();
appleImg.src = 'images/apple.png';

const bombImg = new Image();
bombImg.src = 'images/bomb.png';

items.forEach(item => {
    item.img.src = item.type === 'bomb' ? 'images/bomb.png' : 'images/apple.png';
});

const allImages = [playerImg, ...items.map(item => item.img)];


// =============================================
// メインのゲームループ
// =============================================
function gameLoop() {
    if (gameover) return; // ゲームオーバーならループを停止

    // 1. 入力情報の更新
    updatePlayerPosition();

    // 2. 画面のクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. 各オブジェクトの描画と更新
    drawPlayer();
    updateAndDrawItems();

    // 4. 当たり判定
    checkCollisions();

    // 5. ゲームオーバー判定
    checkGameOver();

    requestAnimationFrame(gameLoop);
}


// =============================================
// ゲームの各処理を行う関数
// =============================================

/**
 * プレイヤーの位置を更新する
 */
function updatePlayerPosition() {
    if (rightPressed && playerX < canvas.width - PLAYER_WIDTH) {
        playerX += PLAYER_SPEED;
    } else if (leftPressed && playerX > 0) {
        playerX -= PLAYER_SPEED;
    }
}

/**
 * プレイヤーを描画する
 */
function drawPlayer() {
    ctx.drawImage(playerImg, playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT);
}

/**
 * アイテムを更新し描画する
 */
function updateAndDrawItems() {
    items.forEach(item => {
        // アイテムを落下させる
        item.y += ITEM_SPEED;
        // 画面下まで落ちたら上に戻す
        if (item.y > canvas.height) {
            resetItem(item);
        }
        ctx.drawImage(item.img, item.x, item.y, ITEM_WIDTH, ITEM_HEIGHT);
    });
}

/**
 * 全アイテムとの当たり判定をチェックする
 */
function checkCollisions() {
    items.forEach(item => {
        if (isColliding(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, item.x, item.y, ITEM_WIDTH, ITEM_HEIGHT)) {
            handleCollision(item);
            resetItem(item);
        }
    });
}

/**
 * 衝突時の処理
 * @param {object} item 衝突したアイテム
 */
function handleCollision(item) {
    if (item.type === 'apple') {
        score += 10;
        scoreEl.textContent = score;
    } else if (item.type === 'bomb') {
        life--;
        lifeEl.textContent = life;
        document.body.classList.add('flash');
        setTimeout(() => document.body.classList.remove('flash'), 100);
    }
}

/**
 * アイテムの位置をリセットする
 * @param {object} item リセットするアイテム
 */
function resetItem(item) {
    item.y = -ITEM_HEIGHT;
    item.x = Math.random() * (canvas.width - ITEM_WIDTH);
}

/**
 * 2つの矩形が衝突しているか判定する
 */
function isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * ゲームオーバーかどうかをチェックし、処理を行う
 */
function checkGameOver() {
    if (life <= 0) {
        gameover = true;
        ctx.font = '48px sans-serif';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    }
}


// =============================================
// イベントリスナー
// =============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
});


// =============================================
// ゲーム開始
// =============================================
Promise.all(allImages.map(img => new Promise(resolve => img.onload = resolve))).then(() => {
    lifeEl.textContent = life;
    scoreEl.textContent = score;
    gameLoop();
});
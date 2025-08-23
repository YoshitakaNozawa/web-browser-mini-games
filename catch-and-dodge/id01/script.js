/**
 * @file catch-and-dodgeゲームのメインロジック
 * 
 * このファイルは、ゲームのキャラクター操作、アイテムの動き、
 * 当たり判定、スコア計算など、ゲームの核となる部分を担当します。
 * 
 * 「設定」「クラス定義」「ゲーム開始処理」の３つのパートに分けて構成しています。
 */

// ===================================================================================
// ① ゲーム全体の設定
// ===================================================================================

/**
 * ゲームで使う画像ファイルへのパスをまとめたオブジェクト
 * @property {string} player - プレイヤーの画像
 * @property {string} apple - リンゴの画像
 * @property {string} bomb - 爆弾の画像
 */
const ASSET_PATHS = {
    player: 'images/player.png',
    apple: 'images/star.png',
    bomb: 'images/bomb.png',
};

/**
 * ゲームの様々な数値を設定するオブジェクト
 */
const CONFIG = {
    /** プレイヤーに関する設定 */
    player: {
        width: 30,   // プレイヤーの幅
        height: 35,  // プレイヤーの高さ
        speed: 4,    // プレイヤーの移動速度
    },
    /** アイテムに関する設定 */
    item: {
        width: 40,   // アイテムの幅
        height: 40,  // アイテムの高さ
        speed: 3,    // アイテムの落下速度
        count: 10,    // アイテムの総数 (リンゴと爆弾)
    },
    /** ゲーム全体に関する設定 */
    game: {
        initialLife: 1, // ゲーム開始時のライフ
    },
};


// ===================================================================================
// ② ゲームの設計図 (クラス定義)
// ===================================================================================

// -----------------------------------------------------------------------------------
// ヘルパー関数 (便利な小道具たち)
// -----------------------------------------------------------------------------------

/**
 * 2つの四角形（矩形）が重なっている（衝突している）か調べる関数
 * @param {object} rect1 - 1つ目の四角形 { x, y, width, height }
 * @param {object} rect2 - 2つ目の四角形 { x, y, width, height }
 * @returns {boolean} - 衝突していれば true, そうでなければ false
 */
function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect2.x < rect1.x + rect1.width &&
        rect1.y < rect2.y + rect2.height &&
        rect2.y < rect1.y + rect1.height
    );
}

/**
 * 指定されたパスから画像を読み込む非同期関数
 * @param {string} src - 画像ファイルのパス
 * @returns {Promise<HTMLImageElement>} - 読み込みが完了したら画像要素を返すPromise
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`画像の読み込みに失敗しました: ${src}`, { cause: e }));
        img.src = src;
    });
}


// -----------------------------------------------------------------------------------
// Player クラス (プレイヤーキャラクターを管理する設計図)
// -----------------------------------------------------------------------------------
class Player {
    /**
     * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス
     * @param {HTMLImageElement} image - プレイヤーの画像
     */
    constructor(canvas, image) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.image = image;

        // 設定オブジェクトからプレイヤーの情報を取得
        this.width = CONFIG.player.width;
        this.height = CONFIG.player.height;
        this.speed = CONFIG.player.speed;

        // プレイヤーの初期位置を計算 (x: 中央, y: 下部)
        this.x = (this.canvas.width - this.width) / 2;
        this.y = this.canvas.height - this.height - 10;

        // キーボードの入力状態を保存するフラグ
        this.rightPressed = false;
        this.leftPressed = false;
    }

    /**
     * 当たり判定で使うための、プレイヤーの四角形の情報を返す
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBoundingBox() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    /**
     * プレイヤーの状態を更新する (主に位置情報)
     */
    update() {
        if (this.rightPressed && this.x < this.canvas.width - this.width) {
            this.x = this.x + this.speed;
        } else if (this.leftPressed && this.x > 0) {
            this.x = this.x - this.speed;
        }
    }

    /**
     * プレイヤーをキャンバスに描画する
     */
    draw() {
        this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}


// -----------------------------------------------------------------------------------
// Item クラス (空から降ってくるアイテムを管理する設計図)
// -----------------------------------------------------------------------------------
class Item {
    /**
     * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス
     * @param {string} type - アイテムの種類 ('apple' または 'bomb')
     * @param {HTMLImageElement} image - アイテムの画像
     */
    constructor(canvas, type, image) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type;
        this.image = image;

        // 設定オブジェクトからアイテムの情報を取得
        this.width = CONFIG.item.width;
        this.height = CONFIG.item.height;
        this.speed = CONFIG.item.speed;

        // アイテムの位置を初期化
        this.reset();
        // ただし、最初のy座標は画面の上方のランダムな位置に設定する
        this.y = -Math.random() * this.canvas.height;
    }

    /**
     * 当たり判定で使うための、アイテムの四角形の情報を返す
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBoundingBox() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    /**
     * アイテムの位置をリセットする (画面上部に戻す)
     */
    reset() {
        this.x = Math.random() * (this.canvas.width - this.width);
        this.y = -this.height;
    }

    /**
     * アイテムの状態を更新する (主に位置情報)
     */
    update() {
        // アイテムを下に移動させる
        this.y = this.y + this.speed;
        // もしアイテムが画面の下端を越えたら、位置をリセットする
        if (this.y > this.canvas.height) {
            this.reset();
        }
    }

    /**
     * アイテムをキャンバスに描画する
     */
    draw() {
        this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}


// -----------------------------------------------------------------------------------
// Game クラス (ゲーム全体の流れを管理する監督役)
// -----------------------------------------------------------------------------------
class Game {
    /**
     * @param {HTMLCanvasElement} canvas - ゲームを描画するキャンバス要素
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // HTMLからスコアとライフを表示する要素を取得
        this.scoreEl = document.getElementById('score');
        this.lifeEl = document.getElementById('life');

        // ゲームで使うオブジェクトや状態を初期化
        this.player = null;   // Playerクラスのインスタンスが入る
        this.items = [];      // Itemクラスのインスタンスの配列が入る
        this.images = {};     // 読み込んだ画像オブジェクトが入る

        this.score = 0;
        this.life = CONFIG.game.initialLife;
        this.isGameOver = false;

        this.animationFrameId = null; // requestAnimationFrameのID
    }

    /**
     * ゲームの初期設定を行う (非同期処理)
     */
    async init() {
        // 1. 必要な画像をすべて読み込む
        await this.loadAssets();
        // 2. プレイヤーとアイテムのオブジェクトを生成する
        this.player = new Player(this.canvas, this.images.player);
        this.createItems();
        // 3. UI（スコアとライフ）を初期表示する
        this.updateUI();
        // 4. キーボード操作のイベントリスナーを設定する
        this.setupEventListeners();
    }

    /**
     * ASSET_PATHSに定義された画像をすべて読み込む
     */
    async loadAssets() {
        const imagePromises = Object.entries(ASSET_PATHS).map(async ([name, path]) => {
            this.images[name] = await loadImage(path);
        });
        await Promise.all(imagePromises);
    }

    /**
     * CONFIG設定に基づいてアイテムを複数生成する
     */
    createItems() {
        for (let i = 0; i < CONFIG.item.count; i++) {
            // 交互にリンゴと爆弾を生成 (iが奇数のとき bomb)
            const type = i % 2 === 1 ? 'bomb' : 'apple';
            const image = this.images[type];
            this.items.push(new Item(this.canvas, type, image));
        }
    }

    /**
     * プレイヤーを操作するためのキーボードイベントを設定する
     */
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.player.rightPressed = true;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.player.leftPressed = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'Right' || e.key === 'ArrowRight') this.player.rightPressed = false;
            if (e.key === 'Left' || e.key === 'ArrowLeft') this.player.leftPressed = false;
        });

        // ----- スマートフォン/タッチ操作のサポートを追加 -----
        const handleTouch = (e) => {
            e.preventDefault(); // 画面のスクロールを防ぐ
            const touchX = e.touches[0].clientX;
            const canvasRect = this.canvas.getBoundingClientRect();
            const canvasMidX = canvasRect.left + canvasRect.width / 2;

            if (touchX < canvasMidX) {
                this.player.leftPressed = true;
                this.player.rightPressed = false;
            } else {
                this.player.rightPressed = true;
                this.player.leftPressed = false;
            }
        };

        const handleTouchEnd = (e) => {
            e.preventDefault();
            this.player.leftPressed = false;
            this.player.rightPressed = false;
        };

        this.canvas.addEventListener('touchstart', handleTouch, { passive: false });
        this.canvas.addEventListener('touchmove', handleTouch, { passive: false });
        this.canvas.addEventListener('touchend', handleTouchEnd);
        this.canvas.addEventListener('touchcancel', handleTouchEnd);
    }

    /**
     * ゲームを開始する
     */
    start() {
        this.gameLoop();
    }

    /**
     * ゲームのメインループ (この中身が毎フレーム実行される)
     */
    gameLoop() {
        // ゲームオーバーならループを停止し、ゲームオーバー画面を表示
        if (this.isGameOver) {
            this.drawGameOver();
            return;
        }

        // 1. 各オブジェクトの状態を更新する (座標の移動など)
        this.update();
        
        // 2. 更新された状態を元に、すべてのオブジェクトを描画する
        this.draw();

        // 3. 次のフレームで再びgameLoopを呼び出すようにブラウザに依頼する
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * ゲーム内のすべてのオブジェクトの状態を更新する
     */
    update() {
        this.player.update();
        this.items.forEach(item => item.update());
        this.checkCollisions();
        this.checkGameOver();
    }

    /**
     * キャンバスをクリアし、すべてのオブジェクトを描画する
     */
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.player.draw();
        this.items.forEach(item => item.draw());
    }

    /**
     * プレイヤーとすべてのアイテムとの当たり判定をチェックする
     */
    checkCollisions() {
        const playerBox = this.player.getBoundingBox();
        this.items.forEach(item => {
            if (isColliding(playerBox, item.getBoundingBox())) {
                this.handleCollision(item);
                item.reset();
            }
        });
    }

    /**
     * 衝突が発生したときの処理
     * @param {Item} item - プレイヤーと衝突したアイテム
     */
    handleCollision(item) {
        if (item.type === 'apple') {
            this.score = this.score + 10;
        } else if (item.type === 'bomb') {
            this.life = this.life - 1;
            this.flashScreen();
        }
        this.updateUI(); // スコアやライフの表示を更新
    }
    
    /**
     * 爆弾に当たったときに画面を赤く点滅させる
     */
    flashScreen() {
        document.body.classList.add('flash');
        setTimeout(() => document.body.classList.remove('flash'), 100);
    }

    /**
     * HTMLのスコアとライフの表示を更新する
     */
    updateUI() {
        this.scoreEl.textContent = this.score;
        this.lifeEl.textContent = this.life;
    }

    /**
     * ライフが0以下になったかチェックし、ゲームオーバー状態にする
     */
    checkGameOver() {
        if (this.life <= 0) {
            this.isGameOver = true;
        }
    }

    /**
     * ゲームオーバーメッセージをキャンバスに表示する
     */
    drawGameOver() {
        this.ctx.font = '70px sans-serif';
        this.ctx.fillStyle = 'blue';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAMEOVER', this.canvas.width / 2, this.canvas.height / 2);
    }
}


// ===================================================================================
// ③ ゲームの開始処理
// ===================================================================================

// HTMLドキュメントの読み込みが完了したら、ゲームの準備を始める
window.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas要素が見つかりません。');
        return;
    }
    
    // Gameクラスのインスタンス（実体）を作成
    const game = new Game(canvas);
    
    try {
        // ゲームの初期化（画像の読み込みなど）が終わるのを待つ
        await game.init();
        // 初期化が完了したら、ゲームを開始する
        game.start();
    } catch (error) {
        console.error('ゲームの初期化中にエラーが発生しました:', error);
        // ここでユーザーにエラーメッセージを表示することもできる
        document.body.innerHTML = '<p>ゲームの読み込みに失敗しました。ページを再読み込みしてください。</p>';
    }
});

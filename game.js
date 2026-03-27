/**
 * 坦克大战游戏 - Tank Battle Game (移动端适配版)
 * 使用HTML5 Canvas构建，支持触摸控制
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('gameContainer');

// 游戏配置
const TILE_SIZE = 40;
const COLS = 20;
const ROWS = 15;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// 游戏状态
let gameRunning = true;
let score = 0;
let lives = 3;
let enemiesKilled = 0;
let gameStartTime = 0;
let timeBonus = 0;

// 方向常量
const DIRECTIONS = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};

// 墙壁类型
const WALL_TYPES = {
    BRICK: 1,
    STEEL: 2
};

// 键盘状态
const keys = {};

// 触摸控制状态
const touchControls = {
    up: false,
    down: false,
    left: false,
    right: false,
    shoot: false
};

// ==================== 音效系统 ====================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }
    
    playShoot() {
        if (!this.enabled || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }
    
    playExplosion() {
        if (!this.enabled || !this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.3);
    }
    
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

const soundManager = new SoundManager();

// ==================== Canvas 自适应 ====================
function resizeCanvas() {
    const containerWidth = gameContainer.clientWidth - 8;
    const maxHeight = window.innerHeight * 0.5;
    const scaleX = containerWidth / GAME_WIDTH;
    const scaleY = maxHeight / GAME_HEIGHT;
    const scale = Math.min(scaleX, scaleY, 1);
    canvas.style.width = (GAME_WIDTH * scale) + 'px';
    canvas.style.height = (GAME_HEIGHT * scale) + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==================== 触摸控制 ====================
function setupTouchControls() {
    const setupBtn = (id, key) => {
        const btn = document.getElementById(id);
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); touchControls[key] = true; soundManager.resume(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); touchControls[key] = false; });
        btn.addEventListener('mousedown', () => { touchControls[key] = true; soundManager.resume(); });
        btn.addEventListener('mouseup', () => touchControls[key] = false);
        btn.addEventListener('mouseleave', () => touchControls[key] = false);
    };
    setupBtn('btnUp', 'up');
    setupBtn('btnDown', 'down');
    setupBtn('btnLeft', 'left');
    setupBtn('btnRight', 'right');
    setupBtn('btnShoot', 'shoot');
}

setupTouchControls();

// ==================== 子弹类 ====================
class Bullet {
    constructor(x, y, direction, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = 8;
        this.radius = 4;
        this.isPlayer = isPlayer;
        this.active = true;
    }
    
    update() {
        switch(this.direction) {
            case DIRECTIONS.UP: this.y -= this.speed; break;
            case DIRECTIONS.RIGHT: this.x += this.speed; break;
            case DIRECTIONS.DOWN: this.y += this.speed; break;
            case DIRECTIONS.LEFT: this.x -= this.speed; break;
        }
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.fillStyle = this.isPlayer ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== 坦克类 ====================
class Tank {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 36;
        this.direction = DIRECTIONS.UP;
        this.speed = isPlayer ? 3 : 1.5;
        this.isPlayer = isPlayer;
        this.color = isPlayer ? '#00ff00' : '#ff4444';
        this.bullets = [];
        this.lastShot = 0;
        this.shootCooldown = isPlayer ? 300 : 1500;
        this.active = true;
        this.moveCooldown = 0;
    }
    
    update() {
        this.bullets = this.bullets.filter(b => b.active);
        this.bullets.forEach(b => b.update());
        if (!this.isPlayer && this.active) this.aiUpdate();
    }
    
    aiUpdate() {
        if (this.moveCooldown > 0) { this.moveCooldown--; return; }
        if (Math.random() < 0.02) this.direction = Math.floor(Math.random() * 4);
        let newX = this.x, newY = this.y;
        switch(this.direction) {
            case DIRECTIONS.UP: newY -= this.speed; break;
            case DIRECTIONS.RIGHT: newX += this.speed; break;
            case DIRECTIONS.DOWN: newY += this.speed; break;
            case DIRECTIONS.LEFT: newX -= this.speed; break;
        }
        if (this.canMove(newX, newY)) { this.x = newX; this.y = newY; }
        else { this.direction = Math.floor(Math.random() * 4); this.moveCooldown = 30; }
        if (Date.now() - this.lastShot > this.shootCooldown && Math.random() < 0.3) this.shoot();
    }
    
    canMove(newX, newY) {
        if (newX < 0 || newX > canvas.width - this.width || newY < 0 || newY > canvas.height - this.height) return false;
        const left = Math.floor(newX / TILE_SIZE), right = Math.floor((newX + this.width) / TILE_SIZE);
        const top = Math.floor(newY / TILE_SIZE), bottom = Math.floor((newY + this.height) / TILE_SIZE);
        for (let row = top; row <= bottom; row++) {
            for (let col = left; col <= right; col++) {
                if (row >= 0 && row < ROWS && col >= 0 && col < COLS && walls[row] && walls[row][col]) return false;
            }
        }
        return true;
    }
    
    move(direction) {
        if (!this.active) return;
        this.direction = direction;
        let newX = this.x, newY = this.y;
        switch(direction) {
            case DIRECTIONS.UP: newY -= this.speed; break;
            case DIRECTIONS.RIGHT: newX += this.speed; break;
            case DIRECTIONS.DOWN: newY += this.speed; break;
            case DIRECTIONS.LEFT: newX -= this.speed; break;
        }
        if (this.canMove(newX, newY)) { this.x = newX; this.y = newY; }
    }
    
    shoot() {
        if (!this.active || Date.now() - this.lastShot <= this.shootCooldown) return;
        let bx = this.x + this.width / 2, by = this.y + this.height / 2;
        switch(this.direction) {
            case DIRECTIONS.UP: by = this.y; break;
            case DIRECTIONS.RIGHT: bx = this.x + this.width; break;
            case DIRECTIONS.DOWN: by = this.y + this.height; break;
            case DIRECTIONS.LEFT: bx = this.x; break;
        }
        this.bullets.push(new Bullet(bx, by, this.direction, this.isPlayer));
        this.lastShot = Date.now();
        soundManager.playShoot();
    }
    
    draw() {
        if (!this.active) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
        ctx.fillStyle = this.isPlayer ? '#00cc00' : '#cc0000';
        const centerX = this.x + this.width / 2, centerY = this.y + this.height / 2;
        ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
        ctx.strokeStyle = this.isPlayer ? '#88ff88' : '#ff8888';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        switch(this.direction) {
            case DIRECTIONS.UP: ctx.lineTo(centerX, this.y); break;
            case DIRECTIONS.RIGHT: ctx.lineTo(this.x + this.width, centerY); break;
            case DIRECTIONS.DOWN: ctx.lineTo(centerX, this.y + this.height); break;
            case DIRECTIONS.LEFT: ctx.lineTo(this.x, centerY); break;
        }
        ctx.stroke();
        this.bullets.forEach(b => b.draw());
    }
    
    getBounds() {
        return { x: this.x + 4, y: this.y + 4, width: this.width - 8, height: this.height - 8 };
    }
}

// ==================== 墙壁类 ====================
class Wall {
    constructor(x, y, type = WALL_TYPES.BRICK) {
        this.x = x; this.y = y; this.size = TILE_SIZE; this.type = type; this.active = true;
    }
    isDestructible() { return this.type === WALL_TYPES.BRICK; }
    draw() {
        if (!this.active) return;
        if (this.type === WALL_TYPES.BRICK) {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(this.x + 2, this.y + 2, this.size - 4, this.size - 4);
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.size, this.size);
        } else {
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.size, this.y + this.size);
            gradient.addColorStop(0, '#708090');
            gradient.addColorStop(0.5, '#C0C0C0');
            gradient.addColorStop(1, '#4a5560');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.size, this.size);
        }
    }
}

// ==================== 粒子效果类 ====================
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 30; this.color = color; this.size = Math.random() * 5 + 3;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; this.size *= 0.95; }
    draw() { ctx.fillStyle = this.color; ctx.globalAlpha = this.life / 30; ctx.fillRect(this.x, this.y, this.size, this.size); ctx.globalAlpha = 1; }
}

// ==================== 游戏对象 ====================
let player, enemies = [], walls = [], particles = [];

// ==================== 初始化墙壁 ====================
function initWalls() {
    walls = [];
    const map = [
        "@@@@@@@@@@@@@@@@@@@@",
        "@..................@",
        "@..##..@@..@@..##..@",
        "@..##..@@..@@..##..@",
        "@......@@..@@......@",
        "@..####......####..@",
        "@..#..........@...@.",
        "@......####......@.@",
        "@..#..........@...@.",
        "@..####......####..@",
        "@......@@..@@......@",
        "@..##..@@..@@..##..@",
        "@..##..@@..@@..##..@",
        "@..................@",
        "@@@@@@@@@@@@@@@@@@@@"
    ];
    for (let row = 0; row < ROWS; row++) {
        walls[row] = [];
        for (let col = 0; col < COLS; col++) {
            const char = map[row] ? map[row][col] : '.';
            if (char === '#') walls[row][col] = new Wall(col * TILE_SIZE, row * TILE_SIZE, WALL_TYPES.BRICK);
            else if (char === '@') walls[row][col] = new Wall(col * TILE_SIZE, row * TILE_SIZE, WALL_TYPES.STEEL);
            else walls[row][col] = null;
        }
    }
}

function createExplosion(x, y, color) { for (let i = 0; i < 15; i++) particles.push(new Particle(x, y, color)); }
function createSparks(x, y) { for (let i = 0; i < 8; i++) particles.push(new Particle(x, y, '#FFD700')); }

// ==================== 初始化游戏 ====================
function initGame() {
    player = new Tank(380, 520, true);
    enemies = []; particles = [];
    score = 0; lives = 3; enemiesKilled = 0; timeBonus = 0;
    gameRunning = true; gameStartTime = Date.now();
    soundManager.resume();
    initWalls();
    spawnEnemies();
    updateUI();
}

function spawnEnemies() {
    const positions = [{x: 60, y: 60}, {x: 380, y: 60}, {x: 700, y: 60}, {x: 60, y: 200}, {x: 700, y: 200}];
    positions.forEach(pos => { const e = new Tank(pos.x, pos.y, false); e.direction = DIRECTIONS.DOWN; enemies.push(e); });
}

// ==================== 碰撞检测 ====================
function checkBulletCollisions() {
    player.bullets.forEach(bullet => {
        if (!bullet.active) return;
        enemies.forEach(enemy => {
            if (!enemy.active) return;
            const b = enemy.getBounds();
            if (bullet.x > b.x && bullet.x < b.x + b.width && bullet.y > b.y && bullet.y < b.y + b.height) {
                bullet.active = false; enemy.active = false;
                createExplosion(enemy.x + 18, enemy.y + 18, '#ff4444');
                soundManager.playExplosion();
                score += 100; enemiesKilled++; updateUI();
            }
        });
        const col = Math.floor(bullet.x / TILE_SIZE), row = Math.floor(bullet.y / TILE_SIZE);
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS && walls[row] && walls[row][col]) {
            bullet.active = false;
            if (walls[row][col].isDestructible()) { createExplosion(walls[row][col].x + 20, walls[row][col].y + 20, '#8B4513'); walls[row][col] = null; }
            else { createSparks(bullet.x, bullet.y); }
        }
    });
    enemies.forEach(enemy => {
        if (!enemy.active) return;
        enemy.bullets.forEach(bullet => {
            if (!bullet.active) return;
            const b = player.getBounds();
            if (bullet.x > b.x && bullet.x < b.x + b.width && bullet.y > b.y && bullet.y < b.y + b.height) {
                bullet.active = false; createExplosion(player.x + 18, player.y + 18, '#00ff00');
                soundManager.playExplosion(); lives--; updateUI();
                if (lives <= 0) gameOver(false);
                else { player.x = 380; player.y = 520; player.direction = DIRECTIONS.UP; }
            }
            const col = Math.floor(bullet.x / TILE_SIZE), row = Math.floor(bullet.y / TILE_SIZE);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS && walls[row] && walls[row][col]) {
                bullet.active = false;
                if (walls[row][col].isDestructible()) { createExplosion(walls[row][col].x + 20, walls[row][col].y + 20, '#8B4513'); walls[row][col] = null; }
                else { createSparks(bullet.x, bullet.y); }
            }
        });
    });
}

// ==================== 格式化时间 ====================
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function calculateTimeBonus() {
    const seconds = Math.floor((Date.now() - gameStartTime) / 1000);
    return Math.max(0, 500 - Math.floor((seconds - 60) / 10) * 50);
}

// ==================== 更新UI ====================
function updateUI() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('enemies').textContent = enemies.filter(e => e.active).length;
    document.getElementById('time').textContent = formatTime(Date.now() - gameStartTime);
}

// ==================== 游戏结束 ====================
function gameOver(won) {
    gameRunning = false;
    const gameOverDiv = document.getElementById('gameOver');
    const title = document.getElementById('gameOverTitle');
    const finalScore = document.getElementById('finalScore');
    const timeBonusElement = document.getElementById('timeBonus');
    if (won) {
        timeBonus = calculateTimeBonus(); score += timeBonus;
        title.textContent = '🎉 胜利！'; title.style.color = '#00ff00';
        if (timeBonusElement) { timeBonusElement.style.display = 'block'; timeBonusElement.textContent = `⏱️ 时间奖励: +${timeBonus}分`; }
    } else {
        title.textContent = '💥 游戏结束'; title.style.color = '#ff0000';
        if (timeBonusElement) timeBonusElement.style.display = 'none';
    }
    finalScore.textContent = `最终分数: ${score}`;
    gameOverDiv.style.display = 'block';
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    initGame();
}

// ==================== 游戏主循环 ====================
function gameLoop() {
    if (gameRunning) updateUI();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * TILE_SIZE, 0); ctx.lineTo(i * TILE_SIZE, canvas.height); ctx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0, i * TILE_SIZE); ctx.lineTo(canvas.width, i * TILE_SIZE); ctx.stroke(); }
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) if (walls[row] && walls[row][col]) walls[row][col].draw();
    if (gameRunning) {
        if (keys['ArrowUp'] || touchControls.up) player.move(DIRECTIONS.UP);
        if (keys['ArrowDown'] || touchControls.down) player.move(DIRECTIONS.DOWN);
        if (keys['ArrowLeft'] || touchControls.left) player.move(DIRECTIONS.LEFT);
        if (keys['ArrowRight'] || touchControls.right) player.move(DIRECTIONS.RIGHT);
        if (keys[' '] || touchControls.shoot) player.shoot();
        player.update();
        enemies.forEach(enemy => enemy.update());
        checkBulletCollisions();
        if (enemies.filter(e => e.active).length === 0) gameOver(true);
    }
    player.draw();
    enemies.forEach(enemy => enemy.draw());
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(gameLoop);
}

// ==================== 键盘事件监听 ====================
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    soundManager.resume();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ==================== 初始化并开始游戏 ====================
initGame();
gameLoop();

/**
 * 坦克大战游戏 - Tank Battle Game
 * 使用HTML5 Canvas构建
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏配置
const TILE_SIZE = 40;
const COLS = 20;
const ROWS = 15;

// 游戏状态
let gameRunning = true;
let score = 0;
let lives = 3;
let enemiesKilled = 0;

// 方向常量
const DIRECTIONS = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};

// 键盘状态
const keys = {};

// 子弹类
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
        
        // 检查边界
        if (this.x < 0 || this.x > canvas.width || 
            this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }
    
    draw() {
        ctx.fillStyle = this.isPlayer ? '#ffff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 发光效果
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// 坦克类
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
        // 更新子弹
        this.bullets = this.bullets.filter(b => b.active);
        this.bullets.forEach(b => b.update());
        
        if (!this.isPlayer && this.active) {
            this.aiUpdate();
        }
    }
    
    aiUpdate() {
        // AI移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown--;
            return;
        }
        
        // 随机改变方向
        if (Math.random() < 0.02) {
            this.direction = Math.floor(Math.random() * 4);
        }
        
        // 尝试移动
        let newX = this.x;
        let newY = this.y;
        
        switch(this.direction) {
            case DIRECTIONS.UP: newY -= this.speed; break;
            case DIRECTIONS.RIGHT: newX += this.speed; break;
            case DIRECTIONS.DOWN: newY += this.speed; break;
            case DIRECTIONS.LEFT: newX -= this.speed; break;
        }
        
        // 检查是否可以移动
        if (this.canMove(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // 遇到障碍，随机换方向
            this.direction = Math.floor(Math.random() * 4);
            this.moveCooldown = 30;
        }
        
        // AI射击
        if (Date.now() - this.lastShot > this.shootCooldown) {
            if (Math.random() < 0.3) {
                this.shoot();
            }
        }
    }
    
    canMove(newX, newY) {
        // 边界检查
        if (newX < 0 || newX > canvas.width - this.width ||
            newY < 0 || newY > canvas.height - this.height) {
            return false;
        }
        
        // 墙壁碰撞检查
        const left = Math.floor(newX / TILE_SIZE);
        const right = Math.floor((newX + this.width) / TILE_SIZE);
        const top = Math.floor(newY / TILE_SIZE);
        const bottom = Math.floor((newY + this.height) / TILE_SIZE);
        
        for (let row = top; row <= bottom; row++) {
            for (let col = left; col <= right; col++) {
                if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                    if (walls[row] && walls[row][col]) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    move(direction) {
        if (!this.active) return;
        
        this.direction = direction;
        let newX = this.x;
        let newY = this.y;
        
        switch(direction) {
            case DIRECTIONS.UP: newY -= this.speed; break;
            case DIRECTIONS.RIGHT: newX += this.speed; break;
            case DIRECTIONS.DOWN: newY += this.speed; break;
            case DIRECTIONS.LEFT: newX -= this.speed; break;
        }
        
        if (this.canMove(newX, newY)) {
            this.x = newX;
            this.y = newY;
        }
    }
    
    shoot() {
        if (!this.active) return;
        
        if (Date.now() - this.lastShot > this.shootCooldown) {
            let bx = this.x + this.width / 2;
            let by = this.y + this.height / 2;
            
            // 根据方向调整子弹位置
            switch(this.direction) {
                case DIRECTIONS.UP: by = this.y; break;
                case DIRECTIONS.RIGHT: bx = this.x + this.width; break;
                case DIRECTIONS.DOWN: by = this.y + this.height; break;
                case DIRECTIONS.LEFT: bx = this.x; break;
            }
            
            this.bullets.push(new Bullet(bx, by, this.direction, this.isPlayer));
            this.lastShot = Date.now();
        }
    }
    
    draw() {
        if (!this.active) return;
        
        // 绘制坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
        
        // 绘制炮塔
        ctx.fillStyle = this.isPlayer ? '#00cc00' : '#cc0000';
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
        
        // 绘制炮管
        ctx.fillStyle = this.isPlayer ? '#88ff88' : '#ff8888';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        switch(this.direction) {
            case DIRECTIONS.UP:
                ctx.lineTo(centerX, this.y);
                break;
            case DIRECTIONS.RIGHT:
                ctx.lineTo(this.x + this.width, centerY);
                break;
            case DIRECTIONS.DOWN:
                ctx.lineTo(centerX, this.y + this.height);
                break;
            case DIRECTIONS.LEFT:
                ctx.lineTo(this.x, centerY);
                break;
        }
        ctx.stroke();
        
        // 绘制子弹
        this.bullets.forEach(b => b.draw());
    }
    
    getBounds() {
        return {
            x: this.x + 4,
            y: this.y + 4,
            width: this.width - 8,
            height: this.height - 8
        };
    }
}

// 墙壁类
class Wall {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = TILE_SIZE;
        this.active = true;
    }
    
    draw() {
        if (!this.active) return;
        
        // 砖墙效果
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.size, this.size);
        
        // 砖块纹理
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(this.x + 2, this.y + 2, this.size - 4, this.size - 4);
        
        // 砖缝
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.size, this.size);
        
        // 内部砖块线
        ctx.beginPath();
        ctx.moveTo(this.x + this.size/2, this.y);
        ctx.lineTo(this.x + this.size/2, this.y + this.size);
        ctx.moveTo(this.x, this.y + this.size/2);
        ctx.lineTo(this.x + this.size, this.y + this.size/2);
        ctx.stroke();
    }
}

// 游戏对象
let player;
let enemies = [];
let walls = [];
let particles = [];

// 初始化墙壁
function initWalls() {
    walls = [];
    // 创建地图边界和内部墙壁
    const map = [
        "####################",
        "#..................#",
        "#..##..##..##..##..#",
        "#..##..##..##..##..#",
        "#..................#",
        "#..####......####..#",
        "#..#............#..#",
        "#......####......#.#",
        "#..#............#..#",
        "#..####......####..#",
        "#..................#",
        "#..##..##..##..##..#",
        "#..##..##..##..##..#",
        "#..................#",
        "####################"
    ];
    
    for (let row = 0; row < ROWS; row++) {
        walls[row] = [];
        for (let col = 0; col < COLS; col++) {
            if (map[row] && map[row][col] === '#') {
                walls[row][col] = new Wall(col * TILE_SIZE, row * TILE_SIZE);
            } else {
                walls[row][col] = null;
            }
        }
    }
}

// 粒子效果类
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 30;
        this.color = color;
        this.size = Math.random() * 5 + 3;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.size *= 0.95;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// 创建爆炸效果
function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// 初始化游戏
function initGame() {
    player = new Tank(380, 520, true);
    enemies = [];
    particles = [];
    score = 0;
    lives = 3;
    enemiesKilled = 0;
    gameRunning = true;
    
    initWalls();
    spawnEnemies();
    updateUI();
}

// 生成敌人
function spawnEnemies() {
    const enemyPositions = [
        {x: 60, y: 60},
        {x: 380, y: 60},
        {x: 700, y: 60},
        {x: 60, y: 200},
        {x: 700, y: 200}
    ];
    
    enemyPositions.forEach(pos => {
        const enemy = new Tank(pos.x, pos.y, false);
        enemy.direction = DIRECTIONS.DOWN;
        enemies.push(enemy);
    });
}

// 碰撞检测
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 检查子弹碰撞
function checkBulletCollisions() {
    // 玩家子弹击中敌人
    player.bullets.forEach(bullet => {
        if (!bullet.active) return;
        
        enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const enemyBounds = enemy.getBounds();
            if (bullet.x > enemyBounds.x && 
                bullet.x < enemyBounds.x + enemyBounds.width &&
                bullet.y > enemyBounds.y && 
                bullet.y < enemyBounds.y + enemyBounds.height) {
                
                bullet.active = false;
                enemy.active = false;
                createExplosion(enemy.x + 18, enemy.y + 18, '#ff4444');
                score += 100;
                enemiesKilled++;
                updateUI();
            }
        });
        
        // 检查击中墙壁
        const col = Math.floor(bullet.x / TILE_SIZE);
        const row = Math.floor(bullet.y / TILE_SIZE);
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            if (walls[row] && walls[row][col]) {
                bullet.active = false;
                createExplosion(walls[row][col].x + 20, walls[row][col].y + 20, '#8B4513');
                walls[row][col] = null;
            }
        }
    });
    
    // 敌人子弹击中玩家
    enemies.forEach(enemy => {
        if (!enemy.active) return;
        
        enemy.bullets.forEach(bullet => {
            if (!bullet.active) return;
            
            const playerBounds = player.getBounds();
            if (bullet.x > playerBounds.x && 
                bullet.x < playerBounds.x + playerBounds.width &&
                bullet.y > playerBounds.y && 
                bullet.y < playerBounds.y + playerBounds.height) {
                
                bullet.active = false;
                createExplosion(player.x + 18, player.y + 18, '#00ff00');
                lives--;
                updateUI();
                
                if (lives <= 0) {
                    gameOver(false);
                } else {
                    // 重置玩家位置
                    player.x = 380;
                    player.y = 520;
                    player.direction = DIRECTIONS.UP;
                }
            }
            
            // 检查击中墙壁
            const col = Math.floor(bullet.x / TILE_SIZE);
            const row = Math.floor(bullet.y / TILE_SIZE);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                if (walls[row] && walls[row][col]) {
                    bullet.active = false;
                    createExplosion(walls[row][col].x + 20, walls[row][col].y + 20, '#8B4513');
                    walls[row][col] = null;
                }
            }
        });
    });
}

// 坦克间碰撞检测
function checkTankCollisions() {
    const playerBounds = player.getBounds();
    
    enemies.forEach(enemy => {
        if (!enemy.active) return;
        
        const enemyBounds = enemy.getBounds();
        if (checkCollision(playerBounds, enemyBounds)) {
            // 简单的推开处理
            const dx = (player.x + player.width/2) - (enemy.x + enemy.width/2);
            const dy = (player.y + player.height/2) - (enemy.y + enemy.height/2);
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) player.x += 2;
                else player.x -= 2;
            } else {
                if (dy > 0) player.y += 2;
                else player.y -= 2;
            }
        }
    });
}

// 更新UI
function updateUI() {
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('enemies').textContent = enemies.filter(e => e.active).length;
}

// 游戏结束
function gameOver(won) {
    gameRunning = false;
    const gameOverDiv = document.getElementById('gameOver');
    const title = document.getElementById('gameOverTitle');
    const finalScore = document.getElementById('finalScore');
    
    if (won) {
        title.textContent = '🎉 胜利！';
        title.style.color = '#00ff00';
    } else {
        title.textContent = '💥 游戏结束';
        title.style.color = '#ff0000';
    }
    
    finalScore.textContent = `最终分数: ${score}`;
    gameOverDiv.style.display = 'block';
}

// 重新开始
function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    initGame();
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格背景
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(canvas.width, i * TILE_SIZE);
        ctx.stroke();
    }
    
    // 绘制墙壁
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (walls[row] && walls[row][col]) {
                walls[row][col].draw();
            }
        }
    }
    
    // 处理玩家输入
    if (keys['w'] || keys['W']) player.move(DIRECTIONS.UP);
    if (keys['s'] || keys['S']) player.move(DIRECTIONS.DOWN);
    if (keys['a'] || keys['A']) player.move(DIRECTIONS.LEFT);
    if (keys['d'] || keys['D']) player.move(DIRECTIONS.RIGHT);
    if (keys[' ']) player.shoot();
    
    // 更新和绘制游戏对象
    player.update();
    player.draw();
    
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
    });
    
    // 更新粒子
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // 碰撞检测
    checkBulletCollisions();
    checkTankCollisions();
    
    // 检查胜利条件
    if (enemies.filter(e => e.active).length === 0) {
        gameOver(true);
    }
    
    requestAnimationFrame(gameLoop);
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 防止方向键滚动页面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 初始化并开始游戏
initGame();
gameLoop();

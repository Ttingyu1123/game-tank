'use strict';
/* 寶物：敵人擊毀時機率掉落，玩家碾過撿取。
   life = +1 命、speed = 限時加速、shield = 限時護盾。 */

const POWERUP_TYPES = Object.freeze(['life', 'speed', 'shield']);

class Powerup {
  constructor(type, x, y) {
    const P = CONST.POWERUP;
    this.type = type;
    // 夾回場內，避免貼邊或藏進 HUD 底下
    const h = P.size / 2;
    this.x = clamp(x, h + 4, CONST.CANVAS_W - h - 4);
    this.y = clamp(y, CONST.HUD_H + h + 6, CONST.CANVAS_H - h - 4);
    this.age = 0;
    this.dead = false;
  }

  get rect() {
    const h = CONST.POWERUP.size / 2;
    return { x: this.x - h, y: this.y - h, w: CONST.POWERUP.size, h: CONST.POWERUP.size };
  }

  update(dt) {
    this.age += dt;
    if (this.age >= CONST.POWERUP.lifetime) this.dead = true;
  }

  draw(ctx, time) {
    const P = CONST.POWERUP;
    // 即將消失：加速閃爍
    if (P.lifetime - this.age < P.blinkTime && Math.floor(time * 8) % 2 === 0) return;
    const h = P.size / 2;
    const bob = Math.sin(time * 4) * 2; // 上下漂浮
    const y = this.y + bob;

    // 底框：深色面板 + 型別色描邊發光
    const colors = { life: '#8ee08a', speed: '#4fc3e8', shield: '#8ab8ff' };
    const c = colors[this.type];
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#161a24';
    ctx.fillRect(this.x - h, y - h, P.size, P.size);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - h, y - h, P.size, P.size);

    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    switch (this.type) {
      case 'life': { // 十字（醫療補給 → +1 命）
        ctx.fillRect(this.x - 3, y - 9, 6, 18);
        ctx.fillRect(this.x - 9, y - 3, 18, 6);
        break;
      }
      case 'speed': { // 雙箭頭
        ctx.beginPath();
        for (const ox of [-5, 4]) {
          ctx.moveTo(this.x + ox - 3, y - 8);
          ctx.lineTo(this.x + ox + 4, y);
          ctx.lineTo(this.x + ox - 3, y + 8);
        }
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.stroke();
        break;
      }
      case 'shield': { // 盾牌
        ctx.beginPath();
        ctx.moveTo(this.x, y - 9);
        ctx.lineTo(this.x + 8, y - 5);
        ctx.lineTo(this.x + 8, y + 2);
        ctx.quadraticCurveTo(this.x + 8, y + 7, this.x, y + 10);
        ctx.quadraticCurveTo(this.x - 8, y + 7, this.x - 8, y + 2);
        ctx.lineTo(this.x - 8, y - 5);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

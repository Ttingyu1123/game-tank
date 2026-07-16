'use strict';
/* 寶物：敵人擊毀時機率掉落，玩家碾過撿取。
   life = +1 命、speed = 限時加速、shield = 限時護盾、
   power = 限時砲彈可破鋼牆、shovel = 基地磚牆限時變鋼牆（含修復）、
   bomb = 全場敵人即毀、star = 火力升級（死亡重置）、
   freeze = 敵人限時全體凍結、gun = 限時連射、coin = 即時加分。 */

/* 加權掉落表：炸彈最稀有 */
const POWERUP_DROPS = Object.freeze([
  ['life', 2], ['speed', 3], ['shield', 3],
  ['power', 2], ['shovel', 2], ['star', 2], ['bomb', 1],
  ['freeze', 2], ['gun', 2], ['coin', 3],
]);
const POWERUP_WEIGHT_SUM = POWERUP_DROPS.reduce((s, [, w]) => s + w, 0);

function randomPowerupType() {
  let roll = Math.random() * POWERUP_WEIGHT_SUM;
  for (const [type, w] of POWERUP_DROPS) {
    roll -= w;
    if (roll < 0) return type;
  }
  return POWERUP_DROPS[0][0];
}

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
    const colors = {
      life: '#8ee08a', speed: '#4fc3e8', shield: '#8ab8ff',
      power: '#ff8438', shovel: '#d8b26a', bomb: '#ff5d5d', star: '#ffe08a',
      freeze: '#9adcff', gun: '#e86bd0', coin: '#ffd24a',
    };
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
      case 'power': { // 彈頭：圓錐頭 + 彈身
        ctx.beginPath();
        ctx.moveTo(this.x, y - 10);
        ctx.lineTo(this.x + 5, y - 2);
        ctx.lineTo(this.x + 5, y + 8);
        ctx.lineTo(this.x - 5, y + 8);
        ctx.lineTo(this.x - 5, y - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#161a24';
        ctx.fillRect(this.x - 5, y + 3, 10, 2);
        break;
      }
      case 'shovel': { // 鏟子：斜柄 + 梯形鏟頭
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x + 7, y - 9);
        ctx.lineTo(this.x - 1, y - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.x - 6, y - 2);
        ctx.lineTo(this.x + 2, y + 6);
        ctx.lineTo(this.x - 2, y + 10);
        ctx.quadraticCurveTo(this.x - 9, y + 9, this.x - 10, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.lineCap = 'butt';
        break;
      }
      case 'bomb': { // 炸彈：圓體 + 引信火花
        ctx.beginPath();
        ctx.arc(this.x - 1, y + 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 3, y - 4);
        ctx.quadraticCurveTo(this.x + 7, y - 8, this.x + 5, y - 10);
        ctx.stroke();
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.arc(this.x + 5, y - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'freeze': { // 雪花：三軸交叉 + 端點分叉
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 3;
          const dx = Math.cos(a), dy = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(this.x - dx * 9, y - dy * 9);
          ctx.lineTo(this.x + dx * 9, y + dy * 9);
          ctx.stroke();
          for (const sgn of [-1, 1]) {
            // 兩端各一組小分叉
            const bx = this.x + sgn * dx * 6, by = y + sgn * dy * 6;
            for (const rot of [Math.PI / 4, -Math.PI / 4]) {
              const fx = Math.cos(a + rot) * 4 * sgn, fy = Math.sin(a + rot) * 4 * sgn;
              ctx.beginPath();
              ctx.moveTo(bx, by);
              ctx.lineTo(bx + fx, by + fy);
              ctx.stroke();
            }
          }
        }
        ctx.lineCap = 'butt';
        break;
      }
      case 'gun': { // 三發並排彈匣
        for (const ox of [-7, 0, 7]) {
          ctx.beginPath();
          ctx.moveTo(this.x + ox, y - 9);       // 彈頭
          ctx.lineTo(this.x + ox + 3, y - 4);
          ctx.lineTo(this.x + ox + 3, y + 8);   // 彈身
          ctx.lineTo(this.x + ox - 3, y + 8);
          ctx.lineTo(this.x + ox - 3, y - 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#161a24';
        ctx.fillRect(this.x - 10, y + 4, 20, 2);
        break;
      }
      case 'coin': { // 銅錢：圓形 + 方孔
        ctx.beginPath();
        ctx.arc(this.x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#161a24';
        ctx.fillRect(this.x - 3, y - 3, 6, 6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(this.x, y, 6.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'star': { // 五角星
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const aOut = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          const aIn = aOut + Math.PI / 5;
          const R = 10, rr = 4.2;
          if (i === 0) ctx.moveTo(this.x + R * Math.cos(aOut), y + R * Math.sin(aOut));
          else ctx.lineTo(this.x + R * Math.cos(aOut), y + R * Math.sin(aOut));
          ctx.lineTo(this.x + rr * Math.cos(aIn), y + rr * Math.sin(aIn));
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

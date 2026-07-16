'use strict';
/* 玩家坦克：鍵盤輸入、生命、重生無敵（閃爍 + 護盾圈）。 */

class Player extends Tank {
  constructor() {
    const P = CONST.PLAYER;
    super(P.spawnX, P.spawnY, CONST.TANK_SIZE, P.speed);
    this.maxBullets = P.maxBullets;
    this.lives = P.lives;
    this.invincible = P.invincibleTime; // 開場也給短暫無敵
    this.speedBoost = 0;                // 加速寶物剩餘秒數
    this.powerTimer = 0;                // 強化砲彈剩餘秒數
    this.gunTimer = 0;                  // 機關槍連射剩餘秒數
    this.starTier = 0;                  // 星星火力等級（死亡重置）
    this.dir = DIR.UP;
  }

  respawn() {
    const P = CONST.PLAYER;
    this.x = P.spawnX;
    this.y = P.spawnY;
    this.dir = DIR.UP;
    this.alive = true;
    this.cooldown = 0;
    this.invincible = P.invincibleTime;
    this.speedBoost = 0; // 死亡清除全部 buff
    this.powerTimer = 0;
    this.gunTimer = 0;
    this.starTier = 0;
  }

  update(dt, game, input) {
    this.updateTimers(dt);
    if (this.invincible > 0) this.invincible -= dt;
    if (this.speedBoost > 0) this.speedBoost -= dt;
    if (this.powerTimer > 0) this.powerTimer -= dt;
    if (this.gunTimer > 0) this.gunTimer -= dt;
    const PU = CONST.POWERUP;
    this.speed = CONST.PLAYER.speed * (this.speedBoost > 0 ? PU.speedMult : 1);
    this.maxBullets = CONST.PLAYER.maxBullets + (this.starTier >= 2 ? 1 : 0);

    const dir = input.currentDir();
    if (dir !== null) {
      this.setDir(dir, game);
      this.move(dt, game);
    }

    if (input.fireHeld() && this.canShoot()) {
      const bSpeed = CONST.PLAYER.bulletSpeed * (this.starTier >= 1 ? PU.starBulletSpeedMult : 1);
      const b = this.shoot(game, 'player', bSpeed);
      if (b && this.powerTimer > 0) b.pierce = true;
      this.cooldown = CONST.PLAYER.cooldown
        * (this.starTier >= 1 ? PU.starCooldownMult : 1)
        * (this.gunTimer > 0 ? PU.gunCooldownMult : 1);
      audioSys.playerShoot();
    }
  }

  draw(ctx, time) {
    if (!this.alive) return;
    // 無敵期間閃爍（每 0.1s 半透明一次）
    const blink = this.invincible > 0 && Math.floor(time * 10) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.55;
    this.drawBody(ctx, '#f0c040', '#9c7a1c');
    ctx.globalAlpha = 1;
    // 護盾圈
    if (this.invincible > 0) {
      ctx.strokeStyle = `rgba(120, 220, 255, ${0.4 + 0.3 * Math.sin(time * 12)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.half + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 加速中：車尾雙排氣流線
    if (this.speedBoost > 0) {
      const v = DIR_VECS[this.dir];
      ctx.strokeStyle = `rgba(79, 195, 232, ${0.35 + 0.3 * Math.sin(time * 20)})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const back = this.half + 4;
      const len = 9 + 4 * Math.sin(time * 16);
      for (const side of [-8, 8]) {
        const sx = this.x - v.x * back + v.y * side;
        const sy = this.y - v.y * back + v.x * side;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - v.x * len, sy - v.y * len);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  }
}

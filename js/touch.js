'use strict';
/* 觸控操作層：浮動虛擬搖桿（左半屏）＋射擊鈕＋暫停鈕。
   只在 coarse pointer 裝置啟用；透過 Input.touchDir / touchFire 餵入，
   與鍵盤共用同一條輸入路徑，遊戲邏輯不需知道輸入來源。 */

class TouchControls {
  static DEAD = 16;   // 搖桿死區（px），小於此距離不動
  static KNOB_MAX = 44; // 搖桿頭最大位移（px）

  constructor(input, game) {
    if (!IS_TOUCH) return;
    this.input = input;
    this.game = game;

    this.ui = document.getElementById('touch-ui');
    this.zone = document.getElementById('stick-zone');
    this.base = document.getElementById('stick-base');
    this.knob = document.getElementById('stick-knob');
    if (!this.ui) return;
    this.ui.hidden = false;
    document.body.classList.add('touch-mode');

    this.stickId = null; // 追蹤搖桿的 pointerId，其餘手指不干擾
    this.ox = 0;
    this.oy = 0;

    this._bindStick();
    this._bindButtons();
    this._bindCanvasTap();
  }

  /* 浮動搖桿：手指落點即為原點，避免固定位置按不準 */
  _bindStick() {
    this.zone.addEventListener('pointerdown', (e) => {
      if (this.stickId !== null) return;
      this.stickId = e.pointerId;
      this.zone.setPointerCapture(e.pointerId);
      this.ox = e.clientX;
      this.oy = e.clientY;
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.base.classList.add('active');
      this._update(e);
    });
    this.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickId) this._update(e);
    });
    const release = (e) => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = null;
      this.input.touchDir = null;
      this.base.classList.remove('active');
      this.knob.style.transform = 'translate(-50%, -50%)';
    };
    this.zone.addEventListener('pointerup', release);
    this.zone.addEventListener('pointercancel', release);
  }

  _update(e) {
    const dx = e.clientX - this.ox;
    const dy = e.clientY - this.oy;
    this.input.touchDir = this._dirFrom(dx, dy);

    // 搖桿頭跟隨手指，限制在 KNOB_MAX 半徑內
    const dist = Math.hypot(dx, dy);
    const k = dist > TouchControls.KNOB_MAX ? TouchControls.KNOB_MAX / dist : 1;
    this.knob.style.transform =
      `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
  }

  /* 主導軸決定四方向；換軸需超過現有軸 25%，避免斜推時方向抖動 */
  _dirFrom(dx, dy) {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < TouchControls.DEAD && ay < TouchControls.DEAD) return null;
    const cur = this.input.touchDir;
    const wasHoriz = cur === DIR.LEFT || cur === DIR.RIGHT;
    const bias = cur === null ? 1 : (wasHoriz ? 0.8 : 1.25);
    if (ax > ay * bias) return dx > 0 ? DIR.RIGHT : DIR.LEFT;
    return dy > 0 ? DIR.DOWN : DIR.UP;
  }

  _bindButtons() {
    const fire = document.getElementById('btn-fire');
    fire.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.touchFire = true;
      // 邊緣觸發：開始畫面（Space）與結束畫面（R）都由射擊鈕兼任
      this.game.onKeyDown('Space');
      this.game.onKeyDown('KeyR');
    });
    const stop = () => { this.input.touchFire = false; };
    fire.addEventListener('pointerup', stop);
    fire.addEventListener('pointercancel', stop);
    fire.addEventListener('pointerleave', stop);

    document.getElementById('btn-pause').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.game.onKeyDown('KeyP');
    });
  }

  /* 點擊畫布也能開始／重新開始，符合手機使用直覺 */
  _bindCanvasTap() {
    this.game.canvas.addEventListener('pointerdown', () => {
      this.game.onKeyDown('Space');
      this.game.onKeyDown('KeyR');
    });
  }
}

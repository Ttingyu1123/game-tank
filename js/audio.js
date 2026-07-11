'use strict';
/* Web Audio 即時合成音效。首次使用者互動後才建立 AudioContext；
   初始化失敗絕不拋出、不影響遊戲流程。 */

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.noiseBuf = null;
    this.failed = false;
  }

  /* 在使用者手勢（keydown/click）時呼叫 */
  ensure() {
    if (this.failed) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.failed = true; return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.25;
        this.master.connect(this.ctx.destination);
        // 預先產生 1 秒白噪音 buffer 供爆炸等音效使用
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) {
      this.failed = true;
      this.ctx = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  _ready() {
    return this.enabled && this.ctx && this.ctx.state === 'running';
  }

  /* 頻率滑移的簡單音 */
  _beep(f0, f1, dur, type, vol, delay) {
    if (!this._ready()) return;
    try {
      const t = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { /* 音效失敗不影響遊戲 */ }
  }

  /* 濾波噪音 */
  _noise(dur, vol, cutoff, delay) {
    if (!this._ready() || !this.noiseBuf) return;
    try {
      const t = this.ctx.currentTime + (delay || 0);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter); filter.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  playerShoot()  { this._beep(900, 300, 0.07, 'square', 0.5); }
  enemyShoot()   { this._beep(480, 180, 0.08, 'sawtooth', 0.3); }
  hitWall()      { this._noise(0.05, 0.35, 1400); }
  brickBreak()   { this._noise(0.14, 0.5, 900); this._beep(220, 90, 0.1, 'triangle', 0.3); }
  bulletCancel() { this._beep(1200, 500, 0.05, 'square', 0.25); }
  tankExplode()  { this._noise(0.4, 0.7, 500); this._beep(130, 30, 0.4, 'sine', 0.7); }
  baseExplode()  { this._noise(0.9, 0.9, 350); this._beep(90, 22, 0.9, 'sine', 0.9); this._noise(0.6, 0.6, 200, 0.15); }
  playerHit()    { this._beep(300, 60, 0.3, 'sawtooth', 0.5); }
  waveStart()    { this._beep(440, 440, 0.12, 'square', 0.4); this._beep(660, 660, 0.14, 'square', 0.4, 0.16); }
  victory()      { [523, 659, 784, 1047].forEach((f, i) => this._beep(f, f, 0.18, 'square', 0.4, i * 0.18)); }
  gameOver()     { [392, 311, 233, 155].forEach((f, i) => this._beep(f, f * 0.9, 0.3, 'triangle', 0.4, i * 0.25)); }
}

const audioSys = new AudioSys();

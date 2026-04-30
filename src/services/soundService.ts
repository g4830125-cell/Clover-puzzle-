/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPlace() {
    this.playTone(440, 'sine', 0.2, 0.05);
    setTimeout(() => this.playTone(880, 'sine', 0.1, 0.03), 50);
  }

  playWin() {
    this.playTone(523.25, 'sine', 0.5, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.5, 0.1), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.5, 0.1), 200); // G5
    setTimeout(() => this.playTone(1046.50, 'sine', 0.8, 0.1), 300); // C6
  }

  playFail() {
    this.playTone(220, 'sawtooth', 0.3, 0.05);
    setTimeout(() => this.playTone(110, 'sawtooth', 0.5, 0.05), 100);
  }

  playCoin() {
    this.playTone(987.77, 'sine', 0.1, 0.05); // B5
    setTimeout(() => this.playTone(1318.51, 'sine', 0.2, 0.05), 50); // E6
  }

  playRefill() {
    this.playTone(440, 'sine', 0.8, 0.05);
  }

  playMagic() {
    this.playTone(880, 'sine', 0.2, 0.05);
    setTimeout(() => this.playTone(1108.73, 'sine', 0.2, 0.05), 100);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.4, 0.05), 200);
  }

  playLose() {
    this.playTone(220, 'sawtooth', 0.5, 0.05);
  }

  playSuccess() {
    this.playTone(880, 'sine', 0.1, 0.05);
  }

  playError() {
    this.playTone(110, 'sine', 0.1, 0.05);
  }

  playClick() {
    this.playTone(660, 'sine', 0.05, 0.03);
  }

  private isBgmPlaying = false;
  private bgmTimeout: any = null;
  startBGM() {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.init();
    
    const playMeasure = () => {
      if (!this.isBgmPlaying) return;
      const now = this.ctx!.currentTime;
      
      const notes = [220, 261.63, 329.63, 392.00]; // Am7 chord arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.frequency.setValueAtTime(freq, now + i * 0.8);
        gain.gain.setValueAtTime(0, now + i * 0.8);
        gain.gain.linearRampToValueAtTime(0.015, now + i * 0.8 + 0.1); // Slightly lower volume for long play
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.8 + 2.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.8);
        osc.stop(now + i * 0.8 + 3);
      });
      
      this.bgmTimeout = setTimeout(playMeasure, 3200);
    };
    
    playMeasure();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimeout) clearTimeout(this.bgmTimeout);
  }
}

export const soundService = new SoundService();

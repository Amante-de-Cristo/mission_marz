// Audio Manager supporting background music from user assets and Web Audio SFX

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private isMusicMuted: boolean = false;
  private isSfxMuted: boolean = false;
  private musicVolume: number = 0.4;
  private sfxVolume: number = 0.5;
  private currentTrackIndex: number = 0;

  public readonly playlist = [
    { title: 'Dust & Solitude', path: '/assets/aistudio/bg_music1_8a5a9371.mp3' },
    { title: 'Red Frontier Voyage', path: '/assets/aistudio/bg_music2_ba26183e.mp3' },
    { title: 'Jezero Crater Sol', path: '/assets/aistudio/bg_music3_00be137f.mp3' },
    { title: 'Cosmic Solitude', path: '/assets/aistudio/bg_music4_1ab39c3b.mp3' },
  ];

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playMusic() {
    this.initContext();
    if (this.isMusicMuted) return;

    if (!this.musicAudio) {
      this.musicAudio = new Audio(this.playlist[this.currentTrackIndex].path);
      this.musicAudio.loop = true;
      this.musicAudio.volume = this.musicVolume;
      this.musicAudio.addEventListener('ended', () => this.nextTrack());
    }

    this.musicAudio.play().catch(() => {
      // Autoplay policy: will start on subsequent click
    });
  }

  public pauseMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
  }

  public toggleMusic(): boolean {
    this.isMusicMuted = !this.isMusicMuted;
    if (this.isMusicMuted) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
    return !this.isMusicMuted;
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.src = this.playlist[this.currentTrackIndex].path;
      if (!this.isMusicMuted) {
        this.musicAudio.play().catch(() => {});
      }
    }
  }

  public prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.src = this.playlist[this.currentTrackIndex].path;
      if (!this.isMusicMuted) {
        this.musicAudio.play().catch(() => {});
      }
    }
  }

  public playTrack(idx: number) {
    if (idx >= 0 && idx < this.playlist.length) {
      this.currentTrackIndex = idx;
      if (this.musicAudio) {
        this.musicAudio.pause();
        this.musicAudio.src = this.playlist[this.currentTrackIndex].path;
        if (!this.isMusicMuted) {
          this.musicAudio.play().catch(() => {});
        }
      } else {
        this.playMusic();
      }
    }
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicAudio) {
      this.musicAudio.volume = this.musicVolume;
    }
  }

  public toggleSfx(): boolean {
    this.isSfxMuted = !this.isSfxMuted;
    return !this.isSfxMuted;
  }

  public getMusicStatus() {
    return {
      isMusicMuted: this.isMusicMuted,
      isPlaying: !this.isMusicMuted && Boolean(this.musicAudio),
      isSfxMuted: this.isSfxMuted,
      trackIndex: this.currentTrackIndex,
      currentTrack: this.playlist[this.currentTrackIndex]?.title || 'Mars Ambient Track',
      trackTitle: this.playlist[this.currentTrackIndex]?.title || 'Mars Ambient Track',
      totalTracks: this.playlist.length,
      volume: this.musicVolume,
    };
  }


  // --- Procedural Web Audio SFX ---

  public playClick() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.04);

    gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPlacePod() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Hydraulic lock thud
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    gain1.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // 2. High-pressure airlock hiss
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.22);
    gain2.gain.setValueAtTime(0.12 * this.sfxVolume, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.24);
  }

  public playRotate() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.08);
    osc.frequency.linearRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playDemolish() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    gain.gain.setValueAtTime(0.35 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playError() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.2 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playDayTick() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playVictory() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playAirlockCycle() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Pressurization hiss
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playAstronautStep() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Low regolith boot crunch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playHelicopterRotor() {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // High-RPM drone / Ingenuity rotor chop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.05);

    gain.gain.setValueAtTime(0.04 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const audioManager = new AudioManager();


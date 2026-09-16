import type { Ambience, MusicTheme } from "./types";

const NOTES: Record<string, number> = {
  A2: 110,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
};

type Chord = string[];

const THEMES: Record<
  MusicTheme,
  { chords: Chord[]; melody: (string | null)[]; bar: number }
> = {
  title: {
    chords: [
      ["A2", "E3", "A3", "C4"],
      ["F3", "A3", "C4", "F4"],
      ["C3", "G3", "C4", "E4"],
      ["G2", "D3", "G3", "B3"],
    ],
    melody: ["E4", null, "A4", "G4", "E4", null, "C4", "D4"],
    bar: 3.4,
  },
  cafe: {
    chords: [
      ["F3", "A3", "C4"],
      ["C3", "G3", "C4", "E4"],
      ["A2", "E3", "A3", "C4"],
      ["G2", "D3", "B3"],
    ],
    melody: ["A4", "G4", null, "E4", "F4", null, "C5", "A4"],
    bar: 2.8,
  },
  snow: {
    chords: [
      ["A2", "E3", "C4"],
      ["G2", "D3", "B3"],
      ["F3", "C4", "A3"],
      ["E3", "B3", "G3"],
    ],
    melody: ["C5", null, "A4", null, "G4", null, "E4", "A4"],
    bar: 3.6,
  },
  warm: {
    chords: [
      ["C3", "G3", "C4", "E4"],
      ["G2", "D3", "G3", "B3"],
      ["A2", "E3", "A3", "C4"],
      ["F3", "A3", "C4", "F4"],
    ],
    melody: ["E4", "G4", "C5", null, "B4", "A4", "G4", "E4"],
    bar: 2.6,
  },
  quiet: {
    chords: [
      ["A2", "E3", "C4"],
      ["F3", "C4"],
      ["C3", "G3", "E4"],
      ["G2", "D3"],
    ],
    melody: [null, "E4", null, null, "C4", null, "A3", null],
    bar: 4.0,
  },
  home: {
    chords: [
      ["C3", "G3", "E4"],
      ["A2", "E3", "C4"],
      ["F3", "A3", "C4"],
      ["G2", "D3", "B3"],
    ],
    melody: ["G4", null, "E4", "C4", null, "D4", "E4", null],
    bar: 3.2,
  },
};

class VNAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private musicGain = 0.55;
  private sfxGain = 0.7;
  private muted = false;
  private theme: MusicTheme = "title";
  private ambience: Ambience = "snow";
  private timer: number | null = null;
  private nextBar = 0;
  private barIndex = 0;
  private snowSrc: AudioBufferSourceNode | null = null;
  private cafeSrc: AudioBufferSourceNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private visibleHandler: (() => void) | null = null;

  unlocked = false;

  unlock() {
    if (this.unlocked && this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    void this.ctx.resume();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.ambBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyGains();
    this.noiseBuf = this.makeNoise(4);
    this.unlocked = true;
    this.startAmbience();
    this.armScheduler();
    if (!this.visibleHandler) {
      this.visibleHandler = () => {
        if (document.visibilityState === "visible") void this.ctx?.resume();
      };
      document.addEventListener("visibilitychange", this.visibleHandler);
    }
  }

  setVolumes(music: number, sfx: number, mute: boolean) {
    this.musicGain = music;
    this.sfxGain = sfx;
    this.muted = mute;
    this.applyGains();
  }

  setTheme(theme: MusicTheme) {
    this.theme = theme;
  }

  setAmbience(kind: Ambience) {
    if (this.ambience === kind) return;
    this.ambience = kind;
    if (this.unlocked) this.startAmbience();
  }

  click() {
    this.blip(880, 0.045, 0.07, 0.9);
  }

  choiceHover() {
    this.blip(660, 0.04, 0.05, 1.1);
  }

  confirm() {
    this.blip(523, 0.08, 0.09, 0.8);
    this.blip(784, 0.1, 0.07, 1.2);
  }

  cup() {
    this.blip(1480, 0.12, 0.05, 0.7);
    this.blip(2100, 0.08, 0.03, 1.1);
  }

  private applyGains() {
    const now = this.ctx?.currentTime ?? 0;
    const m = this.muted ? 0 : 1;
    this.master?.gain.setTargetAtTime(m, now, 0.03);
    this.musicBus?.gain.setTargetAtTime(this.musicGain * this.musicGain * 0.55, now, 0.04);
    this.sfxBus?.gain.setTargetAtTime(this.sfxGain * this.sfxGain, now, 0.03);
    this.ambBus?.gain.setTargetAtTime(this.sfxGain * this.sfxGain * 0.45, now, 0.05);
  }

  private armScheduler() {
    if (!this.ctx) return;
    this.nextBar = this.ctx.currentTime + 0.12;
    this.barIndex = 0;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      while (this.nextBar < t + 0.35) {
        this.scheduleBar(this.nextBar);
        const theme = THEMES[this.theme];
        this.nextBar += theme.bar;
        this.barIndex += 1;
      }
      this.timer = window.setTimeout(tick, 180);
    };
    tick();
  }

  private scheduleBar(when: number) {
    if (!this.ctx || !this.musicBus) return;
    const theme = THEMES[this.theme];
    const chord = theme.chords[this.barIndex % theme.chords.length];
    chord.forEach((n, i) => {
      this.piano(NOTES[n], when + i * 0.03, theme.bar * 0.92, 0.045 / chord.length);
    });
    const step = theme.bar / theme.melody.length;
    theme.melody.forEach((n, i) => {
      if (!n) return;
      this.piano(NOTES[n], when + i * step, step * 1.6, 0.07);
    });
  }

  private piano(freq: number, when: number, dur: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const fil = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc1.type = "triangle";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(freq, when);
    osc2.frequency.setValueAtTime(freq * 2.003, when);
    fil.type = "lowpass";
    fil.frequency.setValueAtTime(1800, when);
    fil.frequency.exponentialRampToValueAtTime(620, when + dur * 0.7);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc1.connect(fil);
    osc2.connect(fil);
    fil.connect(g);
    g.connect(this.musicBus);
    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + dur + 0.05);
    osc2.stop(when + dur + 0.05);
    osc1.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      fil.disconnect();
      g.disconnect();
    };
  }

  private blip(freq: number, dur: number, gain: number, rate: number) {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * rate), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private makeNoise(seconds: number) {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buf;
  }

  private startAmbience() {
    this.stopLoop(this.snowSrc);
    this.stopLoop(this.cafeSrc);
    this.snowSrc = null;
    this.cafeSrc = null;
    if (!this.ctx || !this.ambBus || !this.noiseBuf) return;
    if (this.ambience === "none") return;

    const loop = (filterHz: number, q: number, gain: number) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = this.ctx!.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = filterHz;
      f.Q.value = q;
      const g = this.ctx!.createGain();
      g.gain.value = gain;
      src.connect(f);
      f.connect(g);
      g.connect(this.ambBus!);
      src.start();
      return src;
    };

    if (this.ambience === "snow" || this.ambience === "car") {
      this.snowSrc = loop(this.ambience === "car" ? 900 : 1400, 0.55, this.ambience === "car" ? 0.18 : 0.22);
    }
    if (this.ambience === "cafe") {
      this.cafeSrc = loop(380, 0.7, 0.12);
    }
    if (this.ambience === "home") {
      this.snowSrc = loop(210, 0.85, 0.09);
    }
  }

  private stopLoop(src: AudioBufferSourceNode | null) {
    try {
      src?.stop();
      src?.disconnect();
    } catch {
      /* already stopped */
    }
  }
}

export const audio = new VNAudio();

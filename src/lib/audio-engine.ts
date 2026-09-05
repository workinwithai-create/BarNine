import type { MoveId, PlayMode, Template, TemplateId } from "./bar-nine";

type Listener = (state: { playing: boolean; bar: number; sixteenth: number; mode: PlayMode }) => void;

const NOTE: Record<string, number[]> = {
  "A minor": [220.0, 261.63, 329.63, 392.0, 440.0],
  "C minor": [196.0, 233.08, 261.63, 311.13, 392.0],
  "F minor": [174.61, 207.65, 261.63, 311.13, 349.23],
  "G major": [196.0, 246.94, 293.66, 392.0, 493.88],
  "D minor": [146.83, 174.61, 220.0, 293.66, 349.23],
};

export interface EngineProject {
  template: Template;
  moveId: MoveId;
  mode: PlayMode;
  bpm: number;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function inAfter(bar: number, mode: PlayMode) {
  return mode === "song" && bar >= 8;
}

function inPickup(bar: number, mode: PlayMode) {
  return mode === "song" && bar === 7;
}

function isBar9(bar: number, mode: PlayMode) {
  return mode === "song" && bar === 8;
}

export class BarNineEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private playing = false;
  private nextTime = 0;
  private step = 0;
  private project: EngineProject | null = null;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot() {
    const steps = this.loopSteps();
    const local = this.step % steps;
    return {
      playing: this.playing,
      bar: Math.floor(local / 16),
      sixteenth: local % 16,
      mode: this.project?.mode ?? ("loop" as PlayMode),
    };
  }

  setProject(project: EngineProject) {
    this.project = project;
    const steps = this.loopSteps();
    if (this.step >= steps) this.step = 0;
  }

  seekBar(bar: number) {
    this.step = Math.max(0, bar) * 16;
  }

  async toggle() {
    if (this.playing) {
      this.stop();
      return;
    }
    await this.start();
  }

  async start() {
    if (!this.project) return;
    if (!this.ctx) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = 0.22;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 12000;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      master.connect(filter);
      filter.connect(compressor);
      compressor.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.filter = filter;
      this.noise = noiseBuffer(ctx);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.tick();
    this.emit();
  }

  stop() {
    this.playing = false;
    if (this.timer != null) window.clearTimeout(this.timer);
    this.timer = null;
    this.emit();
  }

  private loopSteps() {
    if (!this.project) return 128;
    return this.project.mode === "song" ? 256 : 128;
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  private tick = () => {
    if (!this.playing || !this.ctx || !this.project) return;
    const secondsPerStep = 60 / this.project.bpm / 4;
    const horizon = this.ctx.currentTime + 0.12;
    const steps = this.loopSteps();
    while (this.nextTime < horizon) {
      this.scheduleStep(this.step % steps, this.nextTime);
      this.nextTime += secondsPerStep;
      this.step = (this.step + 1) % steps;
    }
    this.emit();
    this.timer = window.setTimeout(this.tick, 25);
  };

  private scheduleStep(step: number, time: number) {
    if (!this.project) return;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const { template, moveId, mode } = this.project;
    const notes = NOTE[template.keyName] ?? NOTE["A minor"];
    const muted = inPickup(bar, mode) && moveId === "air-slam" && s >= 8;
    if (muted) return;

    if (this.kickOn(template.id, moveId, mode, bar, s)) this.kick(time, bar, s);
    if (this.snareOn(template.id, moveId, mode, bar, s)) this.snare(time, s, moveId);
    if (this.hatOn(template.id, moveId, mode, bar, s)) this.hat(time, s, template.id, inAfter(bar, mode));
    if (this.percOn(template.id, moveId, mode, bar, s)) this.perc(time, bar);
    if (this.bassOn(template.id, moveId, mode, bar, s)) {
      this.bass(time, notes, s, inAfter(bar, mode) && moveId === "bass-invert");
    }
    if (s === 0) this.pad(time, notes, template.id);
    if (this.leadOn(moveId, mode, bar, s)) this.lead(time, notes, s, bar);
    if (this.crashOn(moveId, mode, bar, s)) this.crash(time);
    if (moveId === "snare-run" && inPickup(bar, mode) && s === 8) this.riser(time);
  }

  private kickOn(id: TemplateId, move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    const after = inAfter(bar, mode);
    const pickup = inPickup(bar, mode);
    if (pickup && move === "snare-run" && s >= 8) return false;
    if (after && move === "half-time") return s === 0;
    if (after && move === "kick-flip") {
      switch (id) {
        case "night-house":
          return s === 0 || s === 8;
        case "pop-radio":
          return s === 0 || s === 6 || s === 8;
        case "trap-topline":
          return s === 0 || s === 6 || s === 8 || s === 10;
        case "indie-ballad":
          return s === 0 || s === 8;
        case "dnb-roller":
          return s === 0 || s === 8;
      }
    }
    switch (id) {
      case "night-house":
        return s === 0 || s === 4 || s === 8 || s === 12;
      case "pop-radio":
        return s === 0 || s === 8 || (s === 6 && bar % 2 === 1);
      case "trap-topline":
        return s === 0 || s === 6 || s === 10;
      case "indie-ballad":
        return s === 0;
      case "dnb-roller":
        return s === 0 || s === 10;
    }
  }

  private snareOn(id: TemplateId, move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    const after = inAfter(bar, mode);
    const pickup = inPickup(bar, mode);
    if (pickup && move === "snare-run" && s >= 8) return true;
    if (after && move === "half-time") return s === 8;
    if (id === "dnb-roller") return s === 4 || s === 12;
    return s === 8 || (id === "pop-radio" && s === 0 && after && move === "crash-one");
  }

  private hatOn(id: TemplateId, move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    const after = inAfter(bar, mode);
    if (after && move === "half-time") return s % 4 === 0;
    if (after && move === "hats-cut") {
      if (id === "indie-ballad" || id === "pop-radio") return s % 2 === 0;
      return s % 4 === 0;
    }
    switch (id) {
      case "night-house":
        return s % 2 === 0;
      case "pop-radio":
        return s % 4 === 0;
      case "trap-topline":
        return true;
      case "indie-ballad":
        return s === 4 || s === 12;
      case "dnb-roller":
        return s % 2 === 0;
    }
  }

  private percOn(id: TemplateId, move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    if (inAfter(bar, mode) && move === "half-time") return false;
    if (id === "trap-topline") return s === 12 || s === 4;
    if (id === "dnb-roller") return s === 6 || s === 14;
    return s === 12;
  }

  private bassOn(id: TemplateId, move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    const after = inAfter(bar, mode);
    if (after && move === "bass-invert") return s === 0 || s === 4 || s === 6 || s === 10 || s === 12;
    if (after && move === "half-time") return s === 0 || s === 8;
    switch (id) {
      case "night-house":
        return s === 0 || s === 8;
      case "pop-radio":
        return s === 0 || s === 8 || s === 4;
      case "trap-topline":
        return s === 0 || s === 8;
      case "indie-ballad":
        return s === 0;
      case "dnb-roller":
        return s === 0 || s === 6 || s === 8;
    }
  }

  private leadOn(move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    if (!(inAfter(bar, mode) && move === "lead-enter")) return false;
    return s === 0 || s === 6 || s === 10 || s === 12;
  }

  private crashOn(move: MoveId, mode: PlayMode, bar: number, s: number): boolean {
    if (!isBar9(bar, mode) || s !== 0) return false;
    return (
      move === "crash-one" ||
      move === "snare-run" ||
      move === "air-slam" ||
      move === "lead-enter" ||
      move === "half-time" ||
      move === "kick-flip"
    );
  }

  private kick(time: number, _bar: number, s: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(s === 0 ? 168 : 150, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.14);
    g.gain.setValueAtTime(1, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  private snare(time: number, s: number, move: MoveId) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const roll = move === "snare-run" && s !== 8;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(roll ? 0.28 : 0.55, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + (roll ? 0.08 : 0.16));
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(time);
    src.stop(time + 0.18);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 180;
    const og = ctx.createGain();
    og.gain.setValueAtTime(roll ? 0.08 : 0.2, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(og);
    og.connect(master);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  private hat(time: number, s: number, id: TemplateId, afterCut: boolean) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 8000;
    const g = ctx.createGain();
    const open = s % 8 === 6 || (afterCut && s === 0);
    const busy = id === "trap-topline" && s % 2 === 1;
    g.gain.setValueAtTime(open ? 0.16 : busy ? 0.04 : 0.08, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.12 : 0.04));
    src.connect(hp);
    hp.connect(g);
    g.connect(master);
    src.start(time);
    src.stop(time + 0.14);
  }

  private perc(time: number, bar: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 680 + (bar % 2) * 120;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private bass(time: number, notes: number[], s: number, invert: boolean) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const degree = invert
      ? s === 0
        ? 2
        : s === 4
          ? 3
          : s === 6
            ? 1
            : 4
      : s === 0
        ? 0
        : s === 8
          ? 2
          : 1;
    osc.frequency.value = (notes[degree] ?? notes[0]) / 2;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = invert ? 520 : 340;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  private pad(time: number, notes: number[], id: TemplateId) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const count = id === "indie-ballad" ? 4 : 3;
    notes.slice(0, count).forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq / (i % 2 === 0 ? 1 : 2);
      osc.detune.value = i === 0 ? -6 : 7;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = id === "indie-ballad" ? 900 : 640;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.06, time + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
      osc.connect(lp);
      lp.connect(g);
      g.connect(master);
      osc.start(time);
      osc.stop(time + 1.7);
    });
  }

  private lead(time: number, notes: number[], s: number, bar: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    const idx = (s + bar) % notes.length;
    osc.frequency.value = notes[idx] * (s === 12 ? 2 : 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + 0.34);
  }

  private crash(time: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 1.4);
    src.connect(hp);
    hp.connect(g);
    g.connect(master);
    src.start(time);
    src.stop(time + 1.5);
  }

  private riser(time: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(400, time);
    bp.frequency.exponentialRampToValueAtTime(4200, time + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(0.1, time + 0.7);
    g.gain.linearRampToValueAtTime(0.001, time + 1);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(time);
    src.stop(time + 1.05);
  }
}

export const engine = new BarNineEngine();

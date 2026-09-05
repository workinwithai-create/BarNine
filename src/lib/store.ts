import { create } from "zustand";
import {
  TEMPLATES,
  templateById,
  type MoveId,
  type PlayMode,
  type TemplateId,
} from "./bar-nine";
import { engine } from "./audio-engine";

const STORAGE_KEY = "barnine-desk-v1";

interface Persisted {
  title: string;
  templateId: TemplateId;
  moveId: MoveId;
  bpm: number;
}

interface DeskState {
  title: string;
  templateId: TemplateId;
  moveId: MoveId;
  bpm: number;
  mode: PlayMode;
  playing: boolean;
  playBar: number;
  playSixteenth: number;
  setTitle: (title: string) => void;
  setBpm: (bpm: number) => void;
  loadTemplate: (id: string) => void;
  setMove: (id: MoveId) => void;
  setMode: (mode: PlayMode) => void;
  setTransport: (playing: boolean, bar: number, sixteenth: number) => void;
  hydrateAudio: () => void;
  hydrateStorage: () => void;
  persist: () => void;
}

function persistNow(slice: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch {
    /* ignore quota */
  }
}

const first = TEMPLATES[0];

export const useDesk = create<DeskState>((set, get) => ({
  title: "Untitled",
  templateId: first.id,
  moveId: "air-slam",
  bpm: first.bpm,
  mode: "loop",
  playing: false,
  playBar: 0,
  playSixteenth: 0,

  setTitle: (title) => {
    set({ title });
    get().persist();
  },
  setBpm: (bpm) => {
    const next = Math.min(200, Math.max(60, bpm));
    set({ bpm: next });
    get().hydrateAudio();
    get().persist();
  },
  loadTemplate: (id) => {
    const template = templateById(id);
    engine.stop();
    set({
      templateId: template.id,
      bpm: template.bpm,
      playBar: 0,
      playSixteenth: 0,
      playing: false,
    });
    get().hydrateAudio();
    get().persist();
  },
  setMove: (id) => {
    set({ moveId: id });
    get().hydrateAudio();
    get().persist();
  },
  setMode: (mode) => {
    engine.stop();
    set({ mode, playBar: 0, playSixteenth: 0, playing: false });
    get().hydrateAudio();
  },
  setTransport: (playing, bar, sixteenth) => set({ playing, playBar: bar, playSixteenth: sixteenth }),
  hydrateAudio: () => {
    const s = get();
    engine.setProject({
      template: templateById(s.templateId),
      moveId: s.moveId,
      mode: s.mode,
      bpm: s.bpm,
    });
  },
  hydrateStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Persisted;
      const template = templateById(saved.templateId);
      set({
        title: saved.title || "Untitled",
        templateId: template.id,
        moveId: saved.moveId ?? "air-slam",
        bpm: saved.bpm || template.bpm,
      });
    } catch {
      /* ignore */
    }
    get().hydrateAudio();
  },
  persist: () => {
    const s = get();
    persistNow({
      title: s.title,
      templateId: s.templateId,
      moveId: s.moveId,
      bpm: s.bpm,
    });
  },
}));

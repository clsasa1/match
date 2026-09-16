import { create } from "zustand";
import type {
  Ambience,
  BackgroundId,
  HistoryLine,
  IraExpr,
  MusicTheme,
  SashaExpr,
  SaveSlot,
  Settings,
  StoryNode,
} from "./types";
import { CHAPTERS, resolveRoute, START_ID, STORY } from "./story";
import {
  DEFAULT_SETTINGS,
  loadEndings,
  loadSlots,
  rememberEnding,
  SAVE_VERSION,
  saveSettings,
  writeSlot,
} from "./save";
import { audio } from "./audio";

export type Screen = "title" | "game" | "credits";
export type Overlay = "none" | "menu" | "history" | "saves" | "settings" | "help" | "chapters";

interface Stage {
  bg: BackgroundId;
  ira: IraExpr | null;
  sasha: SashaExpr | null;
  cg: BackgroundId | null;
  music: MusicTheme;
  ambience: Ambience;
}

interface VNState {
  screen: Screen;
  overlay: Overlay;
  nodeId: string;
  warmth: number;
  flags: Record<string, boolean>;
  history: HistoryLine[];
  stage: Stage;
  typed: number;
  auto: boolean;
  skipHeld: boolean;
  settings: Settings;
  endings: string[];
  saveNotice: string | null;
  applyNode: (id: string, opts?: { silent?: boolean }) => void;
  advance: () => void;
  choose: (index: number) => void;
  completeText: () => void;
  startGame: (fromId?: string) => void;
  toTitle: () => void;
  setOverlay: (o: Overlay) => void;
  setAuto: (v: boolean) => void;
  setSkipHeld: (v: boolean) => void;
  setTyped: (n: number) => void;
  patchSettings: (p: Partial<Settings>) => void;
  saveTo: (index: number) => void;
  loadFrom: (index: number) => void;
  current: () => StoryNode;
  textDone: () => boolean;
}

const initialStage: Stage = {
  bg: "title",
  ira: null,
  sasha: null,
  cg: null,
  music: "title",
  ambience: "snow",
};

function mergeStage(prev: Stage, node: StoryNode): Stage {
  return {
    bg: node.bg ?? prev.bg,
    ira: node.ira !== undefined ? node.ira : prev.ira,
    sasha: node.sasha !== undefined ? node.sasha : prev.sasha,
    cg: node.cg !== undefined ? node.cg : prev.cg,
    music: node.music ?? prev.music,
    ambience: node.ambience ?? prev.ambience,
  };
}

function applyAudio(stage: Stage) {
  audio.setTheme(stage.music);
  audio.setAmbience(stage.ambience);
}

export const useVN = create<VNState>((set, get) => ({
  screen: "title",
  overlay: "none",
  nodeId: START_ID,
  warmth: 0,
  flags: {},
  history: [],
  stage: initialStage,
  typed: 0,
  auto: false,
  skipHeld: false,
  settings: DEFAULT_SETTINGS,
  endings: [],
  saveNotice: null,

  current: () => STORY[get().nodeId] ?? STORY[START_ID],
  textDone: () => {
    const n = get().current();
    return get().typed >= n.text.length;
  },

  applyNode: (id, opts) => {
    let target = id;
    if (target === "route") target = resolveRoute(get().warmth);
    const node = STORY[target];
    if (!node) return;
    if (node.id === "route") {
      get().applyNode(resolveRoute(get().warmth), opts);
      return;
    }
    const stage = mergeStage(get().stage, node);
    applyAudio(stage);
    const history = opts?.silent
      ? get().history
      : node.text
        ? [...get().history, { speaker: node.speaker, text: node.text }].slice(-80)
        : get().history;
    set({
      nodeId: node.id,
      stage,
      typed: 0,
      history,
      overlay: "none",
    });
    if (node.ending) {
      rememberEnding(node.ending);
      set({ endings: loadEndings() });
    }
  },

  completeText: () => {
    const n = get().current();
    set({ typed: n.text.length });
  },

  advance: () => {
    const s = get();
    if (s.overlay !== "none" || s.screen !== "game") return;
    const node = s.current();
    if (node.choices?.length) return;
    if (!s.textDone()) {
      s.completeText();
      audio.click();
      return;
    }
    if (node.ending) {
      set({ screen: "credits" });
      audio.setTheme("quiet");
      return;
    }
    if (node.next) {
      audio.click();
      s.applyNode(node.next);
    }
  },

  choose: (index) => {
    const s = get();
    const node = s.current();
    const choice = node.choices?.[index];
    if (!choice) return;
    audio.confirm();
    if (choice.warmth) set({ warmth: s.warmth + choice.warmth });
    s.applyNode(choice.next);
  },

  startGame: (fromId) => {
    audio.unlock();
    audio.setVolumes(get().settings.music, get().settings.sfx, get().settings.mute);
    audio.confirm();
    const id = fromId && STORY[fromId] ? fromId : START_ID;
    const chapter = CHAPTERS.find((c) => c.id === id);
    set({
      screen: "game",
      overlay: "none",
      warmth: chapter?.warmth ?? 0,
      flags: {},
      history: [],
      stage: initialStage,
      auto: false,
    });
    get().applyNode(id);
  },

  toTitle: () => {
    set({
      screen: "title",
      overlay: "none",
      auto: false,
      stage: initialStage,
    });
    audio.setTheme("title");
    audio.setAmbience("snow");
  },

  setOverlay: (o) => set({ overlay: o, auto: o === "none" ? get().auto : false }),
  setAuto: (v) => set({ auto: v }),
  setSkipHeld: (v) => set({ skipHeld: v }),
  setTyped: (n) => set({ typed: n }),

  patchSettings: (p) => {
    const settings = { ...get().settings, ...p };
    set({ settings });
    saveSettings(settings);
    audio.setVolumes(settings.music, settings.sfx, settings.mute);
  },

  saveTo: (index) => {
    const s = get();
    const slot: SaveSlot = {
      version: SAVE_VERSION,
      nodeId: s.nodeId,
      warmth: s.warmth,
      flags: s.flags,
      history: s.history,
      bg: s.stage.bg,
      ira: s.stage.ira,
      sasha: s.stage.sasha,
      cg: s.stage.cg,
      music: s.stage.music,
      ambience: s.stage.ambience,
      savedAt: Date.now(),
    };
    writeSlot(index, slot);
    set({ saveNotice: `Сохранено в слот ${index + 1}` });
    window.setTimeout(() => {
      if (get().saveNotice?.startsWith("Сохранено")) set({ saveNotice: null });
    }, 1600);
  },

  loadFrom: (index) => {
    const slot = loadSlots()[index];
    if (!slot) return;
    audio.unlock();
    audio.setVolumes(get().settings.music, get().settings.sfx, get().settings.mute);
    const stage: Stage = {
      bg: slot.bg,
      ira: slot.ira,
      sasha: slot.sasha,
      cg: slot.cg,
      music: slot.music,
      ambience: slot.ambience,
    };
    applyAudio(stage);
    set({
      screen: "game",
      overlay: "none",
      nodeId: slot.nodeId,
      warmth: slot.warmth,
      flags: slot.flags,
      history: slot.history,
      stage,
      typed: STORY[slot.nodeId]?.text.length ?? 0,
    });
  },
}));

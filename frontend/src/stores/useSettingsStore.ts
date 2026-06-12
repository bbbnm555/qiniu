import { create } from "zustand";

export type TTSEngine = "browser" | "cosyvoice";

interface SettingsState {
  ttsSpeed: number;
  ttsVolume: number;
  ttsEngine: TTSEngine;
  theme: "normal" | "dark" | "high-contrast";

  setTTSSpeed: (v: number) => void;
  setTTSVolume: (v: number) => void;
  setTTSEngine: (e: TTSEngine) => void;
  setTheme: (t: SettingsState["theme"]) => void;
}

function loadInitial(): Pick<
  SettingsState,
  "ttsSpeed" | "ttsVolume" | "ttsEngine" | "theme"
> {
  try {
    const saved = localStorage.getItem("ai-vision-settings");
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    ttsEngine: "cosyvoice",
    theme: "normal",
  };
}

const initial = loadInitial();

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initial,

  setTTSSpeed: (v) => {
    set({ ttsSpeed: v });
    persist();
  },
  setTTSVolume: (v) => {
    set({ ttsVolume: v });
    persist();
  },
  setTTSEngine: (e) => {
    set({ ttsEngine: e });
    persist();
  },
  setTheme: (t) => {
    set({ theme: t });
    document.documentElement.setAttribute("data-theme", t);
    persist();
  },
}));

function persist() {
  const state = useSettingsStore.getState();
  localStorage.setItem(
    "ai-vision-settings",
    JSON.stringify({
      ttsSpeed: state.ttsSpeed,
      ttsVolume: state.ttsVolume,
      ttsEngine: state.ttsEngine,
      theme: state.theme,
    }),
  );
}

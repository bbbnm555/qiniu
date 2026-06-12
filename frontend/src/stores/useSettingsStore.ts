import { create } from "zustand";

interface SettingsState {
  ttsSpeed: number;
  ttsVolume: number;
  theme: "normal" | "dark" | "high-contrast";

  setTTSSpeed: (v: number) => void;
  setTTSVolume: (v: number) => void;
  setTheme: (t: SettingsState["theme"]) => void;
}

// 从 localStorage 恢复
function loadInitial(): Pick<
  SettingsState,
  "ttsSpeed" | "ttsVolume" | "theme"
> {
  try {
    const saved = localStorage.getItem("ai-vision-settings");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ttsSpeed: 1.0, ttsVolume: 1.0, theme: "normal" };
}

const initial = loadInitial();

export const useSettingsStore = create<SettingsState>((set) => ({
  ...initial,

  setTTSSpeed: (v) => {
    set({ ttsSpeed: v });
    persistSettings();
  },
  setTTSVolume: (v) => {
    set({ ttsVolume: v });
    persistSettings();
  },
  setTheme: (t) => {
    set({ theme: t });
    document.documentElement.setAttribute("data-theme", t);
    persistSettings();
  },
}));

function persistSettings() {
  const state = useSettingsStore.getState();
  localStorage.setItem(
    "ai-vision-settings",
    JSON.stringify({
      ttsSpeed: state.ttsSpeed,
      ttsVolume: state.ttsVolume,
      theme: state.theme,
    }),
  );
}

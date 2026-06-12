import { useCallback } from "react";

/**
 * 语音状态提示 Hook
 * 用浏览器 SpeechSynthesis 播报系统状态
 */
export function useAudioFeedback() {
  const announce = useCallback((message: string, interrupt = false) => {
    if (!window.speechSynthesis) return;
    if (interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = "zh-CN";
    utter.rate = 1.1;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  }, []);

  return { announce };
}

import { useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { useSettingsStore } from "../stores/useSettingsStore";
import { WS_EVENTS } from "../services/websocket/messageTypes";

export function useAudioFeedback() {
  const { send } = useWebSocket();
  const ttsEngine = useSettingsStore((s) => s.ttsEngine);

  const announce = useCallback(
    (message: string, interrupt = false) => {
      if (ttsEngine === "cosyvoice") {
        send(WS_EVENTS.TTS_SPEAK, { text: message });
      } else {
        if (interrupt) window.speechSynthesis?.cancel();
        const utter = new SpeechSynthesisUtterance(message);
        utter.lang = "zh-CN";
        utter.rate = 1.1;
        utter.volume = 1.0;
        window.speechSynthesis?.speak(utter);
      }
    },
    [send, ttsEngine],
  );

  return { announce };
}

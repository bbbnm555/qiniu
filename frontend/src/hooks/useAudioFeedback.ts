import { useCallback, useRef } from "react";

const queueRef: string[] = [];
let speaking = false;

function speakNext() {
  if (speaking || queueRef.length === 0) return;
  if (!window.speechSynthesis) return;

  const text = queueRef.shift()!;
  speaking = true;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = 1.05;
  utter.volume = 1.0;
  utter.onend = () => {
    speaking = false;
    speakNext();
  };
  utter.onerror = () => {
    speaking = false;
    speakNext();
  };
  window.speechSynthesis.speak(utter);
}

/**
 * 语音反馈 — 始终用浏览器 SpeechSynthesis，保证 100% 可靠
 */
export function useAudioFeedback() {
  const announce = useCallback((message: string, interrupt = false) => {
    if (interrupt) {
      window.speechSynthesis?.cancel();
      queueRef.length = 0;
      speaking = false;
    }
    queueRef.push(message);
    speakNext();
  }, []);

  return { announce };
}

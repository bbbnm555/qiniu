const queueRef: string[] = [];
let speaking = false;
let lastMsg = "";
let lastMsgTime = 0;

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
 * 语音反馈 — 相同消息 3 秒内不重复
 */
export function useAudioFeedback() {
  const announce = (message: string, interrupt = false) => {
    const now = Date.now();
    if (message === lastMsg && now - lastMsgTime < 3000) return;
    lastMsg = message;
    lastMsgTime = now;

    if (interrupt) {
      window.speechSynthesis?.cancel();
      queueRef.length = 0;
      speaking = false;
    }
    queueRef.push(message);
    speakNext();
  };

  return { announce };
}

import { useEffect, useRef, useState, useCallback } from "react";

const WAKE_PHRASE = /你好[Vv][Tt]/;

interface UseWakeWordOptions {
  onWake: () => void;
  onQuery: (text: string) => void;
  enabled: boolean; // wake 模式是否启用
}

/**
 * 语音唤醒 + 唤醒后自动问答 Hook
 *
 * - 持续监听"你好VT"→触发 onWake
 * - 唤醒后继续监听，检测到停顿→提交 onQuery
 * - enabled=false 时完全停止
 */
export function useWakeWord({ onWake, onQuery, enabled }: UseWakeWordOptions) {
  const [isWaked, setIsWaked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryTextRef = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if (queryTimer.current) clearTimeout(queryTimer.current);
    setIsListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (!isSupported || !enabled) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // 收集最近的文本
      let latestText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        latestText += event.results[i][0].transcript;
      }

      // 检测唤醒词
      if (!isWaked && WAKE_PHRASE.test(latestText)) {
        setIsWaked(true);
        onWake();
        queryTextRef.current = "";
        return;
      }

      // 唤醒后：收集查询文本
      if (isWaked) {
        queryTextRef.current = latestText.replace(WAKE_PHRASE, "").trim();

        // 2 秒停顿 → 提交查询
        if (queryTimer.current) clearTimeout(queryTimer.current);
        queryTimer.current = setTimeout(() => {
          const text = queryTextRef.current;
          if (text.length > 0) {
            onQuery(text);
            queryTextRef.current = "";
            setIsWaked(false); // 提交后重置，等待下次唤醒
          }
        }, 2000);
      }
    };

    recognition.onerror = () => {
      restartTimer.current = setTimeout(() => {
        if (enabled) startRecognition();
      }, 2000);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (enabled) {
        restartTimer.current = setTimeout(() => startRecognition(), 500);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {}
  }, [isSupported, enabled, isWaked, onWake, onQuery]);

  useEffect(() => {
    if (enabled) {
      setIsWaked(false);
      startRecognition();
    } else {
      stop();
    }
    return stop;
  }, [enabled, startRecognition, stop]);

  const reset = useCallback(() => setIsWaked(false), []);

  return { isWaked, isListening, isSupported, reset };
}

import { useEffect, useRef, useState } from "react";

const WAKE_PHRASE = /你好[Vv][Tt]/;

interface UseWakeWordOptions {
  onWake: () => void;
  onQuery: (text: string) => void;
  enabled: boolean;
}

export function useWakeWord({ onWake, onQuery, enabled }: UseWakeWordOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryTextRef = useRef("");
  const isWakedRef = useRef(false);
  // 用 ref 存回调，避免依赖变化导致重启
  const onWakeRef = useRef(onWake);
  const onQueryRef = useRef(onQuery);
  onWakeRef.current = onWake;
  onQueryRef.current = onQuery;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const clearTimers = () => {
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    if (queryTimer.current) {
      clearTimeout(queryTimer.current);
      queryTimer.current = null;
    }
  };

  useEffect(() => {
    if (!enabled || !isSupported) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      clearTimers();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    let stopped = false;

    const createAndStart = () => {
      if (stopped) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "zh-CN";
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let latestText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          latestText += event.results[i][0].transcript;
        }

        // 检测唤醒词
        if (!isWakedRef.current && WAKE_PHRASE.test(latestText)) {
          isWakedRef.current = true;
          onWakeRef.current();
          queryTextRef.current = "";
          return;
        }

        // 唤醒后收集查询
        if (isWakedRef.current) {
          queryTextRef.current = latestText.replace(WAKE_PHRASE, "").trim();

          if (queryTimer.current) clearTimeout(queryTimer.current);
          queryTimer.current = setTimeout(() => {
            const text = queryTextRef.current;
            if (text.length > 0) {
              onQueryRef.current(text);
              queryTextRef.current = "";
              isWakedRef.current = false;
            }
          }, 2000);
        }
      };

      recognition.onerror = () => {
        if (!stopped) {
          restartTimer.current = setTimeout(createAndStart, 2000);
        }
      };

      recognition.onend = () => {
        if (!stopped) {
          restartTimer.current = setTimeout(createAndStart, 500);
        }
        setIsListening(false);
      };

      try {
        recognition.start();
        setIsListening(true);
      } catch {}
    };

    createAndStart();

    return () => {
      stopped = true;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      clearTimers();
      setIsListening(false);
    };
  }, [enabled, isSupported]);

  return { isListening, isSupported };
}

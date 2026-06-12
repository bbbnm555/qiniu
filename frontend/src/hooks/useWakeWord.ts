import { useEffect, useRef, useState, useCallback } from "react";

const WAKE_PHRASE = /你好[Vv][Tt]/;

/**
 * 语音唤醒 Hook
 *
 * 后台持续监听，检测到"你好VT"即触发回调
 * 唤醒后自动停止，调用 reset() 可重新开始监听
 */
export function useWakeWord(onWake: () => void) {
  const [isWaked, setIsWaked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startRecognition = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // 检查最近几个结果中是否包含唤醒词
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (WAKE_PHRASE.test(text)) {
          setIsWaked(true);
          recognition.stop();
          onWake();
          return;
        }
      }
    };

    recognition.onerror = () => {
      // 出错后 2 秒重试
      restartTimer.current = setTimeout(() => {
        if (!isWaked) startRecognition();
      }, 2000);
    };

    recognition.onend = () => {
      setIsListening(false);
      // 如果还没被唤醒且不是手动停止，重启
      if (!isWaked) {
        restartTimer.current = setTimeout(() => {
          startRecognition();
        }, 500);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
    } catch {
      // 已经在运行
    }
  }, [isSupported, isWaked, onWake]);

  // 启动
  useEffect(() => {
    if (!isWaked) {
      startRecognition();
    }
    return () => {
      recognitionRef.current?.stop();
      if (restartTimer.current) clearTimeout(restartTimer.current);
    };
  }, [isWaked, startRecognition]);

  // 重置（允许再次唤醒）
  const reset = useCallback(() => {
    setIsWaked(false);
  }, []);

  return { isWaked, isListening, isSupported, reset };
}

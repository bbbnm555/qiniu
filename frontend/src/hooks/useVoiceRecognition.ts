import { useState, useRef, useCallback } from "react";

const MAX_RECORD_SECONDS = 30;

interface VoiceRecognitionResult {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

export function useVoiceRecognition(
  onResult: (text: string) => void,
): VoiceRecognitionResult {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const stop = useCallback(() => {
    clearTimer();
    const rec = recognitionRef.current;
    if (rec) {
      recognitionRef.current = null;
      rec.stop();
    }
    setIsListening(false);
    // 提交累积的识别文本
    const text = transcriptRef.current.trim();
    if (text) {
      onResultRef.current(text);
      transcriptRef.current = "";
    }
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    clearTimer();
    // 如果已有旧实例，先停掉
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    transcriptRef.current = "";

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      transcriptRef.current = text;
      setTranscript(text);
    };

    // 所有错误都不改变 isListening，只有手动 stop 才停
    recognition.onerror = (event) => {
      console.warn("语音识别错误:", event.error);
      // no-speech / aborted 等错误忽略，不关闭按钮
    };

    // onend 只做清理，不改 isListening（由 stop() 管理状态）
    recognition.onend = () => {
      // 如果 recognition 实例还在 ref 中（未被 stop 清掉），说明是异常结束
      // 此时自动重启
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // 无法重启，放弃
          recognitionRef.current = null;
          clearTimer();
          setIsListening(false);
        }
      }
    };

    timeoutRef.current = setTimeout(() => {
      stop();
    }, MAX_RECORD_SECONDS * 1000);

    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [isSupported, stop]);

  return { transcript, isListening, isSupported, start, stop };
}

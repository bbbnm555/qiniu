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
  const listeningRef = useRef(false); // 真正的"用户还在按着键"标记
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

  /** 创建并启动一个 recognition 实例 */
  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // 说一句话就停，然后我们在 onend 重启
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      transcriptRef.current = transcriptRef.current
        ? transcriptRef.current + text
        : text;
      setTranscript(transcriptRef.current);
    };

    recognition.onerror = () => {
      // 忽略错误，onend 会处理重启
    };

    recognition.onend = () => {
      // 用户还在按着键 → 重启一个新的 recognition
      if (listeningRef.current) {
        createRecognition();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;
    clearTimer();
    listeningRef.current = true;
    transcriptRef.current = "";
    setTranscript("");
    setIsListening(true);
    createRecognition();

    timeoutRef.current = setTimeout(() => {
      stop();
    }, MAX_RECORD_SECONDS * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, createRecognition]);

  const stop = useCallback(() => {
    clearTimer();
    listeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);

    const text = transcriptRef.current.trim();
    if (text) {
      onResultRef.current(text);
      transcriptRef.current = "";
    }
  }, []);

  return { transcript, isListening, isSupported, start, stop };
}

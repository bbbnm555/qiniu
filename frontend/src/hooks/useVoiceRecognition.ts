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
  const transcriptRef = useRef(""); // 避免闭包捕获旧值
  const onResultRef = useRef(onResult); // 避免 onResult 变化导致重建
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

  const start = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    transcriptRef.current = "";

    recognition.continuous = true; // 持续监听，直到手动 stop
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

    recognition.onerror = () => {
      clearTimer();
      setIsListening(false);
    };

    recognition.onend = () => {
      clearTimer();
      setIsListening(false);
      const text = transcriptRef.current.trim();
      if (text) {
        onResultRef.current(text);
      }
    };

    timeoutRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, MAX_RECORD_SECONDS * 1000);

    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [isSupported]);

  const stop = useCallback(() => {
    clearTimer();
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { transcript, isListening, isSupported, start, stop };
}

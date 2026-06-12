import { useState, useRef, useCallback } from "react";

/** 最长录音时长（秒） */
const MAX_RECORD_SECONDS = 30;

interface VoiceRecognitionResult {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

/**
 * 浏览器原生语音识别 Hook
 *
 * 基于 Web Speech API (SpeechRecognition)
 * - Chrome/Edge 支持良好，Firefox 不支持
 * - 不支持时降级为后端 ASR（通过 AudioRecorder + WS）
 */
export function useVoiceRecognition(
  onResult: (text: string) => void,
): VoiceRecognitionResult {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) {
      console.warn("浏览器不支持 SpeechRecognition，请使用后端 ASR 降级方案");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // 配置
    recognition.continuous = false; // 单次识别（一句话说完即结束）
    recognition.interimResults = true; // 显示中间结果（给用户实时反馈）
    recognition.lang = "zh-CN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      console.error("语音识别错误:", event.error, event.message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // 识别结束，提交结果
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    // 30 秒自动停止
    timeoutRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, MAX_RECORD_SECONDS * 1000);

    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, [isSupported, onResult, transcript]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    start,
    stop,
  };
}

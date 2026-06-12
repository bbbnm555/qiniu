import { useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import {
  WS_EVENTS,
  type ResponseTextPayload,
} from "../services/websocket/messageTypes";

/**
 * TTS 音频播放 Hook
 *
 * 优先使用浏览器内置 SpeechSynthesis（免费、可靠）
 * 同时监听 WS Binary 帧（后端 TTS 音频）作为备选
 */
export function useAudioOutput() {
  const { client, subscribe } = useWebSocket();
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);

  /** 浏览器 TTS 播放一句话 */
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1.0;
    utter.volume = 1.0;
    speakingRef.current = true;

    utter.onend = () => {
      speakingRef.current = false;
      // 播放下一个
      const next = queueRef.current.shift();
      if (next) speakText(next);
    };

    utter.onerror = () => {
      speakingRef.current = false;
      const next = queueRef.current.shift();
      if (next) speakText(next);
    };

    window.speechSynthesis.speak(utter);
  };

  const enqueue = (text: string) => {
    if (speakingRef.current) {
      queueRef.current.push(text);
    } else {
      speakText(text);
    }
  };

  // 监听 WS response.text → 浏览器 TTS 朗读
  useEffect(() => {
    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final) return; // 结束标记不朗读
      if (data.text.trim()) {
        enqueue(data.text.trim());
      }
    });
    return unsub;
  }, [subscribe]);

  // 监听 Binary 帧（后端 TTS 音频，备选）
  useEffect(() => {
    const unsub = client.onBinary((_data: ArrayBuffer) => {
      // Binary 帧已由 response.text 处理，这里忽略
    });
    return unsub;
  }, [client]);

  return {
    clearQueue: () => {
      queueRef.current = [];
      window.speechSynthesis?.cancel();
    },
  };
}

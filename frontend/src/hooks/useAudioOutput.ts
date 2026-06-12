import { useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import {
  WS_EVENTS,
  type ResponseTextPayload,
} from "../services/websocket/messageTypes";

/**
 * TTS 音频播放 Hook
 *
 * 优先使用后端 DashScope cosyvoice TTS（Binary 帧）
 * 如果 3 秒内未收到音频，降级为浏览器 SpeechSynthesis
 */
export function useAudioOutput() {
  const { client, subscribe } = useWebSocket();
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const backendTtsReceived = useRef(false);

  /** 浏览器 TTS 播放 */
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1.0;
    utter.volume = 1.0;
    speakingRef.current = true;
    utter.onend = () => {
      speakingRef.current = false;
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

  // 监听 WS response.text → 作为浏览器的降级方案
  useEffect(() => {
    const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final) return;
      if (!data.text.trim()) return;

      // 等 2.5 秒，如果后端 TTS 音频没到，用浏览器朗读
      const timer = setTimeout(() => {
        if (!backendTtsReceived.current) {
          enqueue(data.text.trim());
        }
        fallbackTimers.delete(data.query_id);
      }, 2500);

      fallbackTimers.set(data.query_id, timer);
    });

    return () => {
      unsub();
      fallbackTimers.forEach((t) => clearTimeout(t));
    };
  }, [subscribe]);

  // 监听 Binary 帧（后端 DashScope TTS 音频）
  useEffect(() => {
    const unsub = client.onBinary((_data: ArrayBuffer) => {
      backendTtsReceived.current = true;
      // Binary 帧到达 → 后端 TTS 工作正常，取消浏览器降级
      // 音频由后端 handler 的 sendBinary 直接发送，前端用 AudioContext 播放
      const ctx = new AudioContext();
      ctx.decodeAudioData(_data.slice(0), (buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => ctx.close();
      });
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

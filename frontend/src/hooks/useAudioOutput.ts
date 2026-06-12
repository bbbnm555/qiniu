import { useEffect, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import type { TTSEngine } from "../stores/useSettingsStore";
import {
  WS_EVENTS,
  type ResponseTextPayload,
} from "../services/websocket/messageTypes";

export function useAudioOutput(engine: TTSEngine) {
  const { client, subscribe } = useWebSocket();
  const queueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  // 每个句子的降级定时器
  const fallbackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const speakBrowser = (text: string) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 1.0;
    utter.volume = 1.0;
    speakingRef.current = true;
    utter.onend = () => {
      speakingRef.current = false;
      const next = queueRef.current.shift();
      if (next) speakBrowser(next);
    };
    utter.onerror = () => {
      speakingRef.current = false;
      const next = queueRef.current.shift();
      if (next) speakBrowser(next);
    };
    window.speechSynthesis.speak(utter);
  };

  const enqueue = (text: string) => {
    if (speakingRef.current) {
      queueRef.current.push(text);
    } else {
      speakBrowser(text);
    }
  };

  // 监听 response.text
  useEffect(() => {
    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final || !data.text.trim()) return;

      if (engine === "browser") {
        enqueue(data.text.trim());
      } else {
        // cosyvoice：等 3 秒，如果 Binary 帧没到再用浏览器
        const timer = setTimeout(() => {
          enqueue(data.text.trim());
          fallbackTimers.current.delete(data.query_id + data.text);
        }, 3000);
        fallbackTimers.current.set(data.query_id + data.text, timer);
      }
    });

    return () => {
      unsub();
      fallbackTimers.current.forEach((t) => clearTimeout(t));
      fallbackTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, engine]);

  // 监听 Binary 帧（cosyvoice 音频）→ 取消对应的降级定时器
  useEffect(() => {
    const unsub = client.onBinary((_data: ArrayBuffer) => {
      if (engine !== "cosyvoice") return;

      // 取消所有待降级的定时器（Binary 帧到了就不需要浏览器替补）
      fallbackTimers.current.forEach((t) => clearTimeout(t));
      fallbackTimers.current.clear();

      // 用 AudioContext 播放
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
  }, [client, engine]);

  return {
    clearQueue: () => {
      queueRef.current = [];
      fallbackTimers.current.forEach((t) => clearTimeout(t));
      fallbackTimers.current.clear();
      window.speechSynthesis?.cancel();
    },
  };
}

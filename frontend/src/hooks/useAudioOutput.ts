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

  // browser 模式：监听 response.text → 浏览器朗读
  useEffect(() => {
    if (engine !== "browser") return;

    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final || !data.text.trim()) return;
      enqueue(data.text.trim());
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, engine]);

  // cosyvoice 模式：监听 Binary 帧 → AudioContext 播放
  useEffect(() => {
    if (engine !== "cosyvoice") return;

    const unsub = client.onBinary((_data: ArrayBuffer) => {
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
      window.speechSynthesis?.cancel();
    },
  };
}

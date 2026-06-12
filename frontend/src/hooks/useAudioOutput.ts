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
  const binaryQueueRef = useRef<ArrayBuffer[]>([]);
  const binaryPlayingRef = useRef(false);

  // ---- 浏览器 TTS ----
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

  // ---- cosyvoice 音频播放（排队） ----
  const playBinary = (data: ArrayBuffer) => {
    if (binaryPlayingRef.current) {
      binaryQueueRef.current.push(data);
      return;
    }
    binaryPlayingRef.current = true;

    const ctx = new AudioContext();
    ctx.decodeAudioData(
      data.slice(0),
      (buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => {
          ctx.close();
          binaryPlayingRef.current = false;
          // 播放下一个
          const next = binaryQueueRef.current.shift();
          if (next) playBinary(next);
        };
      },
      () => {
        // 解码失败，跳过
        ctx.close();
        binaryPlayingRef.current = false;
        const next = binaryQueueRef.current.shift();
        if (next) playBinary(next);
      },
    );
  };

  // browser 模式
  useEffect(() => {
    if (engine !== "browser") return;
    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final || !data.text.trim()) return;
      enqueue(data.text.trim());
    });
    return unsub;
  }, [subscribe, engine]);

  // cosyvoice 模式
  useEffect(() => {
    if (engine !== "cosyvoice") return;
    const unsub = client.onBinary((_data: ArrayBuffer) => {
      playBinary(_data);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, engine]);

  return {
    clearQueue: () => {
      queueRef.current = [];
      binaryQueueRef.current = [];
      window.speechSynthesis?.cancel();
    },
  };
}

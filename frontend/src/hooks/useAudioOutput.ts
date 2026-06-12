import { useRef, useCallback, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { WS_EVENTS } from "../services/websocket/messageTypes";

/**
 * TTS 音频播放 Hook
 *
 * 监听 WebSocket Binary 帧（TTS 音频数据），使用 AudioContext 按序播放
 * 维护一个播放队列，确保音频按句子顺序播放
 */
export function useAudioOutput() {
  const { client } = useWebSocket();
  const audioContextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  const playNext = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const ctx = getAudioContext();

    while (queueRef.current.length > 0) {
      const data = queueRef.current.shift()!;
      try {
        const audioBuffer = await ctx.decodeAudioData(data.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
        });
      } catch {
        // 音频解码失败，跳过
      }
    }

    isPlayingRef.current = false;
  }, [getAudioContext]);

  // 监听 Binary 帧
  useEffect(() => {
    const unsub = client.onBinary((data: ArrayBuffer) => {
      queueRef.current.push(data);
      playNext();
    });

    return unsub;
  }, [client, playNext]);

  // 清理
  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  return {
    /** 清空播放队列 */
    clearQueue: () => {
      queueRef.current = [];
    },
  };
}

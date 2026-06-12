import { useEffect, useRef, useCallback } from "react";
import { WebSocketClient } from "../services/websocket/WebSocketClient";
import { useConnectionStore } from "../stores/useConnectionStore";

const WS_URL =
  import.meta.env.VITE_WS_URL || `ws://${location.hostname}:3001/ws`;

let globalClient: WebSocketClient | null = null;

function getClient(): WebSocketClient {
  if (!globalClient) {
    globalClient = new WebSocketClient(WS_URL);
  }
  return globalClient;
}

export function useWebSocket() {
  const client = getClient();
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setLatency = useConnectionStore((s) => s.setLatency);
  const setReconnectAttempts = useConnectionStore(
    (s) => s.setReconnectAttempts,
  );

  // 连接生命周期
  useEffect(() => {
    client.connect();

    const unsubStatus = client.onStatusChange((status) => {
      setStatus(status);
      setReconnectAttempts(client.reconnectAttempt);
    });

    // 定期同步延迟
    const latencyTimer = setInterval(() => {
      setLatency(client.latency);
    }, 2000);

    return () => {
      unsubStatus();
      clearInterval(latencyTimer);
      // 注意：不在此处断开连接，全局 client 保持存活
    };
  }, [client, setStatus, setLatency, setReconnectAttempts]);

  // 消息订阅
  const subscribe = useCallback(
    (type: string, handler: (payload: unknown) => void) => {
      return client.onMessage(type, handler);
    },
    [client],
  );

  // 发送方法
  const send = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      client.send(type, payload);
    },
    [client],
  );

  const sendBinary = useCallback(
    (data: ArrayBuffer) => {
      client.sendBinary(data);
    },
    [client],
  );

  return {
    client,
    subscribe,
    send,
    sendBinary,
  };
}

export { getClient };

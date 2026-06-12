import { create } from "zustand";
import type { ConnectionStatus } from "../services/websocket/WebSocketClient";

interface ConnectionState {
  status: ConnectionStatus;
  latency: number;
  reconnectAttempts: number;

  setStatus: (status: ConnectionStatus) => void;
  setLatency: (latency: number) => void;
  setReconnectAttempts: (n: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "disconnected",
  latency: 0,
  reconnectAttempts: 0,

  setStatus: (status) => set({ status }),
  setLatency: (latency) => set({ latency }),
  setReconnectAttempts: (n) => set({ reconnectAttempts: n }),
}));

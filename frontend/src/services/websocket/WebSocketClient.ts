import { WS_EVENTS } from "./messageTypes";
import type { WSMessage } from "./messageTypes";
import { getReconnectDelay } from "./reconnect";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

type MessageHandler = (payload: unknown) => void;
type BinaryHandler = (data: ArrayBuffer) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private binaryHandlers = new Set<BinaryHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: (() => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private intentionalClose = false;
  private _status: ConnectionStatus = "disconnected";
  private _latency = 0;
  private lastPingTime = 0;

  constructor(url: string) {
    this.url = url;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get latency(): number {
    return this._latency;
  }

  get reconnectAttempt(): number {
    return this.reconnectAttempts;
  }

  // ---- 连接管理 ----

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (event.data instanceof ArrayBuffer) {
          this.binaryHandlers.forEach((h) => h(event.data as ArrayBuffer));
          return;
        }
        this.handleTextMessage(event.data as string);
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.intentionalClose) {
          this.scheduleReconnect();
        } else {
          this.setStatus("disconnected");
        }
      };

      this.ws.onerror = () => {
        // onclose 会在 onerror 之后触发，这里不需要额外处理
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.cancelReconnect();
    this.ws?.close();
    this.ws = null;
    this.setStatus("disconnected");
  }

  // ---- 消息发送 ----

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn("[WS] 未连接，消息丢弃:", type);
      return;
    }

    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  sendBinary(data: ArrayBuffer): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(data);
  }

  // ---- 事件订阅 ----

  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => this.messageHandlers.get(type)?.delete(handler);
  }

  onBinary(handler: BinaryHandler): () => void {
    this.binaryHandlers.add(handler);
    return () => this.binaryHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // ---- 内部方法 ----

  private handleTextMessage(raw: string): void {
    try {
      const msg: WSMessage = JSON.parse(raw);
      const handlers = this.messageHandlers.get(msg.type);
      if (handlers) {
        handlers.forEach((h) => h(msg.payload));
      }
    } catch {
      // 忽略解析失败的消息
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusHandlers.forEach((h) => h(status));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.lastPingTime = performance.now();
      this.send(WS_EVENTS.PING);
    }, 15_000);

    // 监听 pong 计算延迟
    this.onMessage(WS_EVENTS.PONG, () => {
      this._latency = Math.round(performance.now() - this.lastPingTime);
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    this.setStatus("reconnecting");
    this.cancelReconnect();

    const delay = getReconnectDelay(this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(
      `[WS] ${this.reconnectAttempts} 次重连，${delay / 1000}s 后尝试...`,
    );

    this.reconnectTimer = () => {
      this.connect();
    };
    setTimeout(this.reconnectTimer, delay);
  }

  private cancelReconnect(): void {
    this.reconnectTimer = null;
  }
}

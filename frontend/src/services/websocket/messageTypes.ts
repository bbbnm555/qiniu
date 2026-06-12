// ============================================
// 前端 WebSocket 消息类型（与后端 protocol.ts 对齐）
// ============================================

export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

// --- 客户端 → 服务端 ---
export interface UserQueryPayload {
  query_id: string;
  text: string;
  image_frame?: string;
  audio_base64?: string;
}

export interface FrameUpdatePayload {
  image_base64: string;
  width: number;
  height: number;
}

export interface SettingsUpdatePayload {
  tts_speed?: number;
  tts_volume?: number;
  theme?: string;
}

// --- 服务端 → 客户端 ---
export interface ResponseTextPayload {
  query_id: string;
  text: string;
  is_final: boolean;
}

export interface StatusPayload {
  status: "idle" | "thinking" | "speaking" | "error";
  message?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface PongPayload {
  server_time: number;
}

// --- 事件类型常量 ---
export const WS_EVENTS = {
  // 发送
  USER_QUERY: "user.query",
  FRAME_UPDATE: "frame.update",
  QUERY_CANCEL: "query.cancel",
  SETTINGS_UPDATE: "settings.update",
  TTS_SPEAK: "tts.speak",
  PING: "ping",
  // 接收
  RESPONSE_TEXT: "response.text",
  STATUS: "status",
  ERROR: "error",
  PONG: "pong",
} as const;

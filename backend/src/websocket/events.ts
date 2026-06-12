// ============================================
// WebSocket 事件类型常量
// ============================================

// 客户端 → 服务端
export const CLIENT_EVENTS = {
  USER_QUERY: "user.query",
  FRAME_UPDATE: "frame.update",
  QUERY_CANCEL: "query.cancel",
  SETTINGS_UPDATE: "settings.update",
  PING: "ping",
} as const;

// 服务端 → 客户端
export const SERVER_EVENTS = {
  RESPONSE_TEXT: "response.text",
  RESPONSE_AUDIO: "response.audio", // Binary 帧，不通过 JSON
  STATUS: "status",
  ERROR: "error",
  PONG: "pong",
} as const;

// 连接状态
export const SESSION_STATUS = {
  IDLE: "idle",
  THINKING: "thinking",
  SPEAKING: "speaking",
  ERROR: "error",
} as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

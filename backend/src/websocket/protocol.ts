// ============================================
// WebSocket 消息协议类型定义
// ============================================

// ---- 基础消息结构 ----
export interface WSMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

// ---- 客户端 → 服务端 ----

/** 用户提问 */
export interface UserQueryPayload {
  query_id: string;
  text: string;
  image_frame?: string; // base64 JPEG（可选，使用最新已缓存的帧）
  audio_base64?: string; // 原始音频 base64（后端 ASR 降级方案）
}

/** 摄像头帧更新（持续发送，仅保留最新一帧） */
export interface FrameUpdatePayload {
  image_base64: string;
  width: number;
  height: number;
}

/** 取消当前查询 */
export interface QueryCancelPayload {
  query_id: string;
}

/** 用户设置同步 */
export interface SettingsUpdatePayload {
  tts_speed?: number;
  tts_volume?: number;
  theme?: string;
}

// ---- 服务端 → 客户端 ----

/** AI 文本响应（流式，逐句推送） */
export interface ResponseTextPayload {
  query_id: string;
  text: string;
  is_final: boolean;
}

/** 服务状态通知 */
export interface StatusPayload {
  status: "idle" | "thinking" | "speaking" | "error";
  message?: string;
}

/** 错误信息 */
export interface ErrorPayload {
  code:
    | "AI_TIMEOUT"
    | "AI_ERROR"
    | "INVALID_AUDIO"
    | "RATE_LIMIT"
    | "SESSION_ERROR"
    | "INTERNAL";
  message: string;
}

/** 心跳响应 */
export interface PongPayload {
  server_time: number;
}

// ---- 类型联合（用于 handler 分发） ----
export type ClientMessage =
  | WSMessage<UserQueryPayload>
  | WSMessage<FrameUpdatePayload>
  | WSMessage<QueryCancelPayload>
  | WSMessage<SettingsUpdatePayload>
  | WSMessage<Record<string, never>>; // ping

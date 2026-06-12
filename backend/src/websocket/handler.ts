import type { WebSocket } from "ws";
import type { Session } from "./session.js";
import {
  createSession,
  getSession,
  removeSession,
  updateSessionActivity,
} from "./session.js";
import { CLIENT_EVENTS, SERVER_EVENTS } from "./events.js";
import type {
  WSMessage,
  UserQueryPayload,
  FrameUpdatePayload,
  QueryCancelPayload,
  SettingsUpdatePayload,
} from "./protocol.js";
import { logger } from "../utils/logger.js";

type MessageHandler = (
  session: Session,
  payload: unknown,
) => void | Promise<void>;

const handlers = new Map<string, MessageHandler>();

// ---- 注册消息处理器 ----

handlers.set(CLIENT_EVENTS.USER_QUERY, async (session, payload) => {
  const data = payload as UserQueryPayload;
  logger.info(
    { sessionId: session.id, queryId: data.query_id },
    `📩 收到 user.query: "${data.text.slice(0, 50)}..."`,
  );

  session.activeQueryId = data.query_id;

  // TODO: Task-08 集成 visionService
  sendToClient(session.ws, SERVER_EVENTS.STATUS, {
    status: "thinking",
    message: "正在分析...",
  });

  // 占位：模拟响应
  sendToClient(session.ws, SERVER_EVENTS.RESPONSE_TEXT, {
    query_id: data.query_id,
    text: "视觉理解服务即将上线，请先完成 AI 服务配置。",
    is_final: true,
  });

  sendToClient(session.ws, SERVER_EVENTS.STATUS, {
    status: "idle",
  });

  session.activeQueryId = null;
});

handlers.set(CLIENT_EVENTS.FRAME_UPDATE, (session, payload) => {
  const data = payload as FrameUpdatePayload;
  session.latestFrame = data.image_base64;
});

handlers.set(CLIENT_EVENTS.QUERY_CANCEL, (session, payload) => {
  const data = payload as QueryCancelPayload;
  logger.info(
    { sessionId: session.id, queryId: data.query_id },
    "🛑 查询已取消",
  );

  // TODO: Task-08 abort AI 调用
  session.activeQueryId = null;

  sendToClient(session.ws, SERVER_EVENTS.STATUS, {
    status: "idle",
    message: "已取消",
  });
});

handlers.set(CLIENT_EVENTS.SETTINGS_UPDATE, (session, payload) => {
  const data = payload as SettingsUpdatePayload;
  if (data.tts_speed != null) session.settings.ttsSpeed = data.tts_speed;
  if (data.tts_volume != null) session.settings.ttsVolume = data.tts_volume;
  logger.debug(
    { sessionId: session.id, settings: session.settings },
    "⚙️ 设置已更新",
  );
});

handlers.set(CLIENT_EVENTS.PING, (session) => {
  sendToClient(session.ws, SERVER_EVENTS.PONG, {
    server_time: Date.now(),
  });
});

// ---- WS 消息入口 ----

export function handleMessage(ws: WebSocket, raw: string): void {
  let msg: WSMessage;

  try {
    msg = JSON.parse(raw);
  } catch {
    sendToClient(ws, SERVER_EVENTS.ERROR, {
      code: "INVALID_AUDIO",
      message: "无效的消息格式",
    });
    return;
  }

  if (!msg.type) {
    sendToClient(ws, SERVER_EVENTS.ERROR, {
      code: "INVALID_AUDIO",
      message: "消息缺少 type 字段",
    });
    return;
  }

  // 从 WS 实例关联到 session（需先查询）
  // 这里假设 WS 实例上存储了 sessionId
  const sessionId = (ws as unknown as { sessionId?: string }).sessionId;
  const session = sessionId ? getSession(sessionId) : undefined;

  if (!session && msg.type !== CLIENT_EVENTS.PING) {
    sendToClient(ws, SERVER_EVENTS.ERROR, {
      code: "SESSION_ERROR",
      message: "会话未建立",
    });
    return;
  }

  const handler = handlers.get(msg.type);
  if (!handler) {
    logger.warn({ type: msg.type }, "未知消息类型");
    return;
  }

  if (session) updateSessionActivity(session.id);
  handler(session!, msg.payload);
}

// ---- 连接管理 ----

export function handleConnection(ws: WebSocket): Session {
  const session = createSession(ws);

  // 将 sessionId 挂载到 WS 实例上
  (ws as unknown as { sessionId: string }).sessionId = session.id;

  // 通知前端会话已建立
  sendToClient(ws, SERVER_EVENTS.STATUS, {
    status: "idle",
    message: "连接已建立",
  });

  logger.info({ sessionId: session.id }, "🔗 WebSocket 连接已建立");
  return session;
}

export function handleDisconnection(ws: WebSocket): void {
  const sessionId = (ws as unknown as { sessionId?: string }).sessionId;
  if (sessionId) {
    removeSession(sessionId);
    logger.info({ sessionId }, "🔌 WebSocket 连接已断开");
  }
}

// ---- 工具函数 ----

export function sendToClient(
  ws: WebSocket,
  type: string,
  payload: unknown,
): void {
  if (ws.readyState !== ws.OPEN) return;

  const message: WSMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(message));
}

export function sendBinaryToClient(ws: WebSocket, data: ArrayBuffer): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(data);
}

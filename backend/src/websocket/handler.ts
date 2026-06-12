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
import { visionService } from "../services/ai/visionService.js";
import { ttsService } from "../services/ai/ttsService.js";
import { ContextService } from "../services/ai/contextService.js";
import { logger } from "../utils/logger.js";

// 每个 session 持有独立的对话上下文
const sessionContexts = new Map<string, ContextService>();

function getContext(sessionId: string): ContextService {
  if (!sessionContexts.has(sessionId)) {
    sessionContexts.set(sessionId, new ContextService());
  }
  return sessionContexts.get(sessionId)!;
}

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
  const context = getContext(session.id);

  // 保存用户消息到上下文
  context.addUserMessage(data.text);

  sendToClient(session.ws, SERVER_EVENTS.STATUS, {
    status: "thinking",
    message: "正在分析...",
  });

  try {
    // 使用传入的帧或 session 中缓存的 latestFrame
    const imageFrame = data.image_frame || session.latestFrame;

    if (!imageFrame) {
      sendToClient(session.ws, SERVER_EVENTS.RESPONSE_TEXT, {
        query_id: data.query_id,
        text: "暂未收到摄像头画面，请先开启摄像头再提问。",
        is_final: true,
      });
      sendToClient(session.ws, SERVER_EVENTS.STATUS, { status: "idle" });
      session.activeQueryId = null;
      return;
    }

    // 调用视觉 AI 服务（流式）
    let fullAnswer = "";
    for await (const sentence of visionService.analyze({
      imageBase64: imageFrame,
      question: data.text,
      context: context.getContext(),
    })) {
      fullAnswer += sentence;

      // 发送文本
      sendToClient(session.ws, SERVER_EVENTS.RESPONSE_TEXT, {
        query_id: data.query_id,
        text: sentence,
        is_final: false,
      });

      // 合成 TTS 音频并发送（仅 cosyvoice 模式）
      if (session.settings.ttsEngine === "cosyvoice") {
        const audio = await ttsService.synthesize(sentence, {
          speed: session.settings.ttsSpeed,
        });
        if (audio) {
          sendBinaryToClient(session.ws, audio.buffer);
        }
      }
    }

    // 发送结束标记
    sendToClient(session.ws, SERVER_EVENTS.RESPONSE_TEXT, {
      query_id: data.query_id,
      text: "",
      is_final: true,
    });

    // 保存 AI 回答到上下文
    if (fullAnswer) {
      context.addAssistantMessage(fullAnswer);
    }

    sendToClient(session.ws, SERVER_EVENTS.STATUS, {
      status: "speaking",
    });
  } catch (err) {
    logger.error({ err, sessionId: session.id }, "AI 处理出错");
    sendToClient(session.ws, SERVER_EVENTS.ERROR, {
      code: "AI_ERROR",
      message: "AI 处理出错，请重试",
    });
  } finally {
    session.activeQueryId = null;
  }
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

  visionService.cancel(data.query_id);
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
  if (data.tts_engine != null) session.settings.ttsEngine = data.tts_engine;
  logger.debug(
    { sessionId: session.id, settings: session.settings },
    "⚙️ 设置已更新",
  );
});

handlers.set(CLIENT_EVENTS.TTS_SPEAK, async (session, payload) => {
  const data = payload as { text: string };
  if (!data.text) return;
  const audio = await ttsService.synthesize(data.text, {
    speed: session.settings.ttsSpeed,
  });
  if (audio) {
    sendBinaryToClient(session.ws, audio.buffer);
  }
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

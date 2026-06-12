import type { WebSocket } from "ws";
import { v4 as uuid } from "uuid";
import { SESSION_STATUS, type SessionStatus } from "./events.js";
import { logger } from "../utils/logger.js";

interface Session {
  id: string;
  ws: WebSocket;
  status: SessionStatus;
  /** 最新摄像头帧（base64 JPEG） */
  latestFrame: string | null;
  /** 当前正在处理的 query_id */
  activeQueryId: string | null;
  /** 对话上下文（最近 N 轮） */
  context: Array<{ role: "user" | "assistant"; content: string }>;
  /** TTS 设置 */
  settings: {
    ttsSpeed: number;
    ttsVolume: number;
  };
  connectedAt: number;
  lastActivityAt: number;
}

const sessions = new Map<string, Session>();

export function createSession(ws: WebSocket): Session {
  const session: Session = {
    id: uuid(),
    ws,
    status: SESSION_STATUS.IDLE,
    latestFrame: null,
    activeQueryId: null,
    context: [],
    settings: {
      ttsSpeed: 1.0,
      ttsVolume: 1.0,
    },
    connectedAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  sessions.set(session.id, session);
  logger.info({ sessionId: session.id }, "📥 新会话已创建");

  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function removeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    // 取消正在进行的 AI 查询
    if (session.activeQueryId) {
      // abort 逻辑由 handler 层处理
    }
    sessions.delete(sessionId);
    logger.info({ sessionId }, "📤 会话已移除");
  }
}

export function updateSessionActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = Date.now();
  }
}

export function getAllSessions(): Session[] {
  return Array.from(sessions.values());
}

export function getSessionCount(): number {
  return sessions.size;
}

export type { Session };

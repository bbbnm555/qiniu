import { WebSocketServer, type Server as HTTPServer } from "ws";
import {
  handleConnection,
  handleMessage,
  handleDisconnection,
} from "./handler.js";
import { logger } from "../utils/logger.js";

let wss: WebSocketServer | null = null;

/**
 * 将 WebSocket 服务挂载到 HTTP 服务器
 */
export function attachWebSocket(server: HTTPServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const session = handleConnection(ws);

    ws.on("message", (raw) => {
      const data = raw.toString();
      handleMessage(ws, data);
    });

    ws.on("close", () => {
      handleDisconnection(ws);
    });

    ws.on("error", (err) => {
      logger.error({ err, sessionId: session.id }, "WebSocket 错误");
    });
  });

  wss.on("error", (err) => {
    logger.error({ err }, "WebSocket 服务器错误");
  });

  logger.info("🔌 WebSocket 服务已启动 (路径: /ws)");

  return wss;
}

export function getWSS(): WebSocketServer | null {
  return wss;
}

import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { attachWebSocket } from "./websocket/index.js";
import { logger } from "./utils/logger.js";

// 启动时校验环境变量
try {
  loadEnv();
  logger.info("✅ 环境变量校验通过");
} catch (err) {
  logger.fatal({ err }, "环境变量校验失败");
  process.exit(1);
}

const { PORT } = loadEnv();

const app = createApp();
const server = createServer(app);

// 挂载 WebSocket 服务
attachWebSocket(server);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "🚀 后端服务已启动");
  logger.info({ url: `http://localhost:${PORT}` }, "HTTP API 地址");
  logger.info("WebSocket 服务已就绪 (ws://localhost:" + PORT + "/ws)");
});

// 优雅关闭
process.on("SIGTERM", () => {
  logger.info("收到 SIGTERM，正在关闭服务...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  logger.info("收到 SIGINT，正在关闭服务...");
  server.close(() => process.exit(0));
});

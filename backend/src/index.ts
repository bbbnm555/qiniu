import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = createApp();
const server = createServer(app);

server.listen(PORT, () => {
  logger.info({ port: PORT }, "🚀 后端服务已启动");
  logger.info({ url: `http://localhost:${PORT}` }, "HTTP API 地址");
  logger.info(`WebSocket 服务已就绪 (将随 Task-04 激活)`);
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

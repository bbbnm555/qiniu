import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { healthRouter } from "./routes/health.js";

export function createApp(): express.Application {
  const app = express();

  // 安全中间件
  app.use(helmet({ contentSecurityPolicy: false })); // CSP 在开发环境灵活处理
  app.use(
    cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }),
  );

  // 请求解析
  app.use(express.json({ limit: "1mb" })); // JSON body 限制 1MB（大数据走 WS）

  // 日志
  app.use(requestLogger);

  // 路由
  app.use("/api", healthRouter);

  // 全局错误处理（必须最后注册）
  app.use(errorHandler);

  return app;
}

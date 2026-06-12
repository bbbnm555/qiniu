import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message =
    statusCode === 500 ? "服务器内部错误" : err.message || "未知错误";

  logger.error({ err, statusCode, code }, "请求处理出错");

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

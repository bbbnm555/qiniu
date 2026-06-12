import type { Request, Response, NextFunction } from "express";

/**
 * 自定义安全中间件
 * helmet 已经处理了大部分安全头，这里补充额外的安全检查
 */
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // 禁止 MIME 类型嗅探
  res.setHeader("X-Content-Type-Options", "nosniff");

  // 点击劫持防护（frame 策略）
  res.setHeader("X-Frame-Options", "DENY");

  // XSS 过滤器
  res.setHeader("X-XSS-Protection", "0"); // 现代浏览器已废弃，设为 0

  // 引用策略
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // 权限策略
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=()",
  );

  next();
}

/**
 * 请求体大小限制（额外的防护层）
 */
export function bodySizeLimit(maxBytes: number = 1_048_576) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `请求体大小超过限制（最大 ${Math.round(maxBytes / 1024)}KB）`,
        },
      });
      return;
    }

    next();
  };
}

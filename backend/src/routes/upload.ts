import { Router } from "express";
import { kodoService } from "../services/qiniu/kodoService.js";

export const uploadRouter = Router();

/** 获取七牛云上传 Token */
uploadRouter.get("/upload/token", (_req, res) => {
  const token = kodoService.getUploadToken();
  if (!token) {
    res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message:
          "七牛云存储服务未配置，请设置 QINIU_ACCESS_KEY 和 QINIU_SECRET_KEY",
      },
    });
    return;
  }

  res.json({
    success: true,
    data: { token },
  });
});

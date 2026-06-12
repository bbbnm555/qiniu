import { z } from "zod";
import { logger } from "../utils/logger.js";

const envSchema = z.object({
  // 服务端口
  PORT: z
    .string()
    .default("3001")
    .transform((v) => parseInt(v, 10)),
  FRONTEND_URL: z.string().default("http://localhost:5173"),

  // AI 视觉模型（开发阶段可选，运行时按需校验）
  VISION_API_URL: z
    .string()
    .default("https://api.openai.com/v1/chat/completions"),
  VISION_API_KEY: z.string().optional(),
  VISION_MODEL: z.string().default("gpt-4o"),

  // TTS 语音合成（开发阶段可选）
  TTS_API_URL: z.string().default("https://api.openai.com/v1/audio/speech"),
  TTS_API_KEY: z.string().optional(),
  TTS_VOICE: z.string().default("alloy"),

  // 七牛云
  QINIU_ACCESS_KEY: z.string().optional(),
  QINIU_SECRET_KEY: z.string().optional(),
  QINIU_BUCKET: z.string().default("first-cc-assets"),
  QINIU_CDN_DOMAIN: z.string().optional(),
  QINIU_UPLOAD_ZONE: z.enum(["z0", "z1", "z2", "na0", "as0"]).default("z2"),

  // 日志
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`❌ 环境变量校验失败:\n${errors}\n请检查 .env 文件配置`);
  }

  _env = result.data;

  // 开发阶段：提示缺失的可选配置
  if (!_env.VISION_API_KEY) {
    logger.warn("⚠️  VISION_API_KEY 未配置，视觉理解服务暂不可用");
  }
  if (!_env.TTS_API_KEY) {
    logger.warn("⚠️  TTS_API_KEY 未配置，语音合成服务暂不可用");
  }
  if (!_env.QINIU_ACCESS_KEY || !_env.QINIU_SECRET_KEY) {
    logger.warn("⚠️  七牛云密钥未配置，云存储服务暂不可用");
  }

  return _env;
}

export function getEnv(): Env {
  if (!_env) return loadEnv();
  return _env;
}

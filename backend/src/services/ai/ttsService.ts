import { getEnv } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * TTS 语音合成服务
 *
 * 支持两种 API 格式：
 * 1. OpenAI 兼容格式 — 返回 raw audio bytes
 * 2. 阿里云 DashScope 格式 — 返回 base64 JSON → 解码为 Buffer
 *
 * 自动根据 TTS_API_URL 判断使用哪种格式
 */
export class TTSService {
  private cache = new Map<string, ArrayBuffer>();

  async synthesize(
    text: string,
    options?: { speed?: number; voice?: string },
  ): Promise<{ buffer: ArrayBuffer; format: string } | null> {
    const env = getEnv();
    if (!env.TTS_API_KEY) {
      logger.warn("TTS_API_KEY 未配置，跳过语音合成");
      return null;
    }

    const cacheKey = `${text}|${options?.speed || 1.0}|${options?.voice || env.TTS_VOICE}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return { buffer: cached, format: "mp3" };

    // 自动判断 API 类型
    const isDashScope = env.TTS_API_URL.includes("dashscope");

    try {
      if (isDashScope) {
        return await this.synthesizeDashScope(text, options);
      }
      return await this.synthesizeOpenAI(text, options);
    } catch (err) {
      logger.error({ err }, "TTS 调用异常");
      return null;
    }
  }

  /** OpenAI 兼容 TTS（返回 raw bytes） */
  private async synthesizeOpenAI(
    text: string,
    options?: { speed?: number; voice?: string },
  ): Promise<{ buffer: ArrayBuffer; format: string } | null> {
    const env = getEnv();

    const response = await fetch(env.TTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TTS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: options?.voice || env.TTS_VOICE,
        speed: options?.speed || 1.0,
        response_format: "mp3",
      }),
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    this.cacheIfRoom(cacheKey(text, options), buffer);
    return { buffer, format: "mp3" };
  }

  /** 阿里云 DashScope TTS（返回 JSON 含 base64 音频） */
  private async synthesizeDashScope(
    text: string,
    options?: { speed?: number; voice?: string },
  ): Promise<{ buffer: ArrayBuffer; format: string } | null> {
    const env = getEnv();

    const response = await fetch(env.TTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TTS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "cosyvoice-v1",
        input: { text },
        parameters: {
          voice: options?.voice || env.TTS_VOICE || "longxiaochun",
          format: "mp3",
          sample_rate: 48000,
          rate: options?.speed || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "无法读取错误");
      logger.error(
        { status: response.status, body: errText },
        "DashScope TTS 请求失败",
      );
      return null;
    }

    const data = await response.json();
    const audioBase64 = data?.output?.audio;
    if (!audioBase64) {
      logger.error("DashScope TTS 响应缺少音频数据");
      return null;
    }

    // 解码 base64 → Buffer
    const buffer = Buffer.from(audioBase64, "base64").buffer as ArrayBuffer;
    this.cacheIfRoom(cacheKey(text, options), buffer);
    return { buffer, format: "mp3" };
  }

  private cacheIfRoom(key: string, buffer: ArrayBuffer): void {
    if (this.cache.size < 100) {
      this.cache.set(key, buffer);
    }
  }
}

function cacheKey(
  text: string,
  options?: { speed?: number; voice?: string },
): string {
  return `${text}|${options?.speed || 1.0}|${options?.voice || ""}`;
}

export const ttsService = new TTSService();

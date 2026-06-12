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

  /** 阿里云 DashScope TTS（cosyvoice-v3-flash） */
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
        model: "cosyvoice-v3-flash",
        input: {
          text,
          voice: options?.voice || env.TTS_VOICE || "longanyang",
          format: "mp3",
          sample_rate: 24000,
          rate: options?.speed || 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "无法读取错误");
      logger.error(
        { status: response.status, body: errText.slice(0, 300) },
        "DashScope TTS 请求失败",
      );
      return null;
    }

    const data = await response.json();

    // 优先从 base64 data 获取，否则从 url 下载
    const audioBase64 = data?.output?.audio?.data;
    const audioUrl = data?.output?.audio?.url;

    if (audioBase64) {
      const buffer = Buffer.from(audioBase64, "base64").buffer as ArrayBuffer;
      this.cacheIfRoom(cacheKey(text, options), buffer);
      return { buffer, format: "mp3" };
    }

    if (audioUrl) {
      const audioResp = await fetch(audioUrl);
      const buffer = await audioResp.arrayBuffer();
      this.cacheIfRoom(cacheKey(text, options), buffer);
      return { buffer, format: "mp3" };
    }

    logger.error(
      { response: JSON.stringify(data).slice(0, 200) },
      "TTS 响应无音频",
    );
    return null;
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

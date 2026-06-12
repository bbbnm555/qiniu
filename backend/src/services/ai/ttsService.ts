import { getEnv } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * TTS 语音合成服务
 *
 * 调用兼容 OpenAI 格式的 TTS API
 * 返回 PCM/MP3 音频 Buffer，通过 WS Binary 帧推送到前端
 */
export class TTSService {
  /** 缓存常见短语，减少 API 调用 */
  private cache = new Map<string, ArrayBuffer>();

  /**
   * 文本转语音
   * @returns AudioBuffer + 格式信息
   */
  async synthesize(
    text: string,
    options?: { speed?: number; voice?: string },
  ): Promise<{ buffer: ArrayBuffer; format: string } | null> {
    const env = getEnv();

    if (!env.TTS_API_KEY) {
      logger.warn("TTS_API_KEY 未配置，跳过语音合成");
      return null;
    }

    // 检查缓存
    const cacheKey = `${text}|${options?.speed || 1.0}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { buffer: cached, format: "mp3" };
    }

    try {
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

      if (!response.ok) {
        logger.error({ status: response.status }, "TTS API 请求失败");
        return null;
      }

      const buffer = await response.arrayBuffer();

      // 缓存（限制缓存大小）
      if (this.cache.size < 100) {
        this.cache.set(cacheKey, buffer);
      }

      return { buffer, format: "mp3" };
    } catch (err) {
      logger.error({ err }, "TTS 调用异常");
      return null;
    }
  }
}

export const ttsService = new TTSService();

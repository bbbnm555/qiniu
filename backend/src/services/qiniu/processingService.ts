import { getQiniuConfig } from "../../config/qiniu.js";
import { logger } from "../../utils/logger.js";

/**
 * 七牛云音视频处理服务（Dora）
 *
 * 支持的持久化处理：
 * - 音频转码：avthumb/mp3, avthumb/wav
 * - 音频降噪（Dora 插件）
 * - 视频帧提取
 */
export class ProcessingService {
  /**
   * 提交音频转码任务
   * @param sourceKey Kodo 上的源文件 key
   * @param targetFormat 目标格式（mp3/wav）
   */
  async transcodeAudio(
    sourceKey: string,
    targetFormat: "mp3" | "wav" = "mp3",
  ): Promise<string | null> {
    const config = getQiniuConfig();
    if (!config) return null;

    // 持久化处理指令
    // const fops = `avthumb/${targetFormat}`;
    // const saveasKey = `${sourceKey}_${targetFormat}.${targetFormat}`;
    // 需要 SDK 签名后调用处理 API

    logger.info(
      { sourceKey, targetFormat },
      "音频转码任务（需要七牛 SDK 签名）",
    );
    return null;
  }

  /**
   * 音频降噪增强
   */
  async denoiseAudio(sourceKey: string): Promise<string | null> {
    const config = getQiniuConfig();
    if (!config) return null;
    logger.info({ sourceKey }, "音频降噪（需要七牛 SDK + Dora 插件）");
    return null;
  }
}

export const processingService = new ProcessingService();

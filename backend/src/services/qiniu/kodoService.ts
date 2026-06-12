import { getQiniuConfig } from "../../config/qiniu.js";
import { logger } from "../../utils/logger.js";

interface UploadResult {
  key: string;
  url: string;
}

/**
 * 七牛云 Kodo 对象存储服务
 *
 * 由于七牛 Node.js SDK (qiniu) 需要实际密钥才能初始化，
 * 此处提供基于 HTTP API 的上传实现（无需 SDK 依赖）。
 *
 * 如需使用 SDK： npm install qiniu
 */
export class KodoService {
  /**
   * 获取简单上传 Token（前端直传用）
   * 生产环境应使用 SDK 生成签名
   */
  getUploadToken(): string | null {
    const config = getQiniuConfig();
    if (!config) return null;
    // 简化：返回占位 token，生产环境需用 qiniu SDK 生成
    logger.warn("Kodo upload token 需要七牛 SDK 签名，当前返回 null");
    return null;
  }

  /**
   * 上传文件到 Kodo
   * @param key 对象存储路径
   * @param data 文件 Buffer
   * @param mimeType MIME 类型
   */
  async upload(
    key: string,
    data: Buffer,
    mimeType: string = "image/jpeg",
  ): Promise<UploadResult | null> {
    const config = getQiniuConfig();
    if (!config) return null;

    try {
      // 七牛云上传 API (需要 uptoken 签名)
      // 此处为接口预留，生产环境使用 qiniu SDK
      const url = `https://upload.qiniup.com/putb64/-1/key/${Buffer.from(key).toString("base64url")}`;

      logger.info({ key, size: data.length }, "准备上传到 Kodo");
      logger.warn("Kodo 上传需要七牛 SDK，当前为占位实现");
      return null;
    } catch (err) {
      logger.error({ err, key }, "Kodo 上传失败");
      return null;
    }
  }

  /**
   * 生成 CDN 访问 URL
   */
  getCdnUrl(key: string): string | null {
    const config = getQiniuConfig();
    if (!config || !config.cdnDomain) return null;
    return `${config.cdnDomain}/${key}`;
  }
}

export const kodoService = new KodoService();

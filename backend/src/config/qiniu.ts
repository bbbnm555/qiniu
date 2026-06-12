import { getEnv } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * 七牛云配置（从环境变量加载）
 */
export function getQiniuConfig() {
  const env = getEnv();

  if (!env.QINIU_ACCESS_KEY || !env.QINIU_SECRET_KEY) {
    logger.warn("七牛云密钥未配置，云存储/音视频处理服务暂不可用");
    return null;
  }

  return {
    accessKey: env.QINIU_ACCESS_KEY,
    secretKey: env.QINIU_SECRET_KEY,
    bucket: env.QINIU_BUCKET,
    cdnDomain: env.QINIU_CDN_DOMAIN,
    uploadZone: env.QINIU_UPLOAD_ZONE,
  };
}

/**
 * 摄像头帧捕获器
 *
 * 策略：使用 canvas 定时从 video 元素截取 JPEG 帧
 * - 默认每 2 秒一帧（视障用户不需要流畅视频，关键是清晰的场景图像）
 * - JPEG 质量 0.7，平衡清晰度与带宽
 */

export interface FrameCapturer {
  start(onFrame: (jpegBase64: string) => void): void;
  stop(): void;
  /** 立即捕获一帧 */
  captureNow(): string | null;
}

export function createFrameCapturer(
  videoElement: HTMLVideoElement,
  intervalMs: number = 2000,
): FrameCapturer {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  let timerId: ReturnType<typeof setInterval> | null = null;

  function capture(): string | null {
    if (videoElement.readyState < 2) return null; // 视频未就绪

    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7);
  }

  return {
    start(onFrame: (jpegBase64: string) => void) {
      // 立即捕获第一帧
      const firstFrame = capture();
      if (firstFrame) onFrame(firstFrame);

      // 定时捕获
      timerId = setInterval(() => {
        const frame = capture();
        if (frame) onFrame(frame);
      }, intervalMs);
    },

    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },

    captureNow() {
      return capture();
    },
  };
}

/**
 * 获取用户媒体设备（后置摄像头 + 麦克风）
 * 视障用户场景：优先使用后置摄像头（对准环境）
 */
export async function getUserMediaStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: "environment", // 后置摄像头
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000, // 语音识别常用采样率
    },
  };

  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * 获取可用设备列表
 */
export async function getMediaDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    cameras: devices.filter((d) => d.kind === "videoinput"),
    microphones: devices.filter((d) => d.kind === "audioinput"),
  };
}

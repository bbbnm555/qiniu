import { useRef, useCallback } from "react";
import { useMediaStore } from "../stores/useMediaStore";
import {
  getUserMediaStream,
  createFrameCapturer,
  getMediaDevices,
  type FrameCapturer,
} from "../services/media/cameraCapture";
import { useWebSocket } from "./useWebSocket";
import { WS_EVENTS } from "../services/websocket/messageTypes";

export function useMediaStream() {
  const {
    cameraStream,
    isCapturing,
    isFrameCaptureActive,
    setCameraStream,
    setIsCapturing,
    setIsFrameCaptureActive,
    setCameras,
    setMicrophones,
    stopAll,
  } = useMediaStore();

  const { send } = useWebSocket();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const capturerRef = useRef<FrameCapturer | null>(null);

  /** 启动摄像头 + 帧捕获 */
  const startCamera = useCallback(async () => {
    try {
      // 获取设备列表
      const devices = await getMediaDevices();
      setCameras(devices.cameras);
      setMicrophones(devices.microphones);

      // 获取媒体流
      const stream = await getUserMediaStream();
      setCameraStream(stream);
      setIsCapturing(true);

      // 将流绑定到 video 元素（用于帧捕获）
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // 启动帧捕获器
        const capturer = createFrameCapturer(videoRef.current, 2000);
        capturerRef.current = capturer;

        capturer.start((jpegBase64) => {
          setIsFrameCaptureActive(true);

          // 通过 WebSocket 发送最新帧到后端
          send(WS_EVENTS.FRAME_UPDATE, {
            image_base64: jpegBase64,
            width: videoRef.current?.videoWidth || 640,
            height: videoRef.current?.videoHeight || 480,
          });
        });
      }
    } catch (err) {
      console.error("摄像头启动失败:", err);
      // 用户拒绝权限 或 设备不可用
      stopAll();
      throw err;
    }
  }, [
    setCameraStream,
    setIsCapturing,
    setIsFrameCaptureActive,
    setCameras,
    setMicrophones,
    stopAll,
    send,
  ]);

  /** 停止摄像头 */
  const stopCamera = useCallback(() => {
    capturerRef.current?.stop();
    capturerRef.current = null;
    stopAll();
  }, [stopAll]);

  return {
    cameraStream,
    isCapturing,
    isFrameCaptureActive,
    videoRef,
    startCamera,
    stopCamera,
  };
}

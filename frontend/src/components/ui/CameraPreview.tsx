import { useRef, useEffect } from "react";
import styles from "./CameraPreview.module.css";

interface CameraPreviewProps {
  stream: MediaStream | null;
  /** 是否正在传输帧到后端 */
  isStreaming?: boolean;
}

export default function CameraPreview({
  stream,
  isStreaming = false,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <div className={styles.container} aria-label="摄像头预览">
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        playsInline
        // 屏幕阅读器：视频仅用于预览，不包含关键信息
        aria-hidden="true"
      />
      <div className={styles.badge} aria-live="polite">
        {isStreaming ? "📡 实时传输中" : "📷 预览"}
      </div>
    </div>
  );
}

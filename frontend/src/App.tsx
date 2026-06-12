import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import IconButton from "./components/ui/IconButton";
import VoiceIndicator from "./components/ui/VoiceIndicator";
import StatusBadge from "./components/ui/StatusBadge";
import CameraPreview from "./components/ui/CameraPreview";
import { useAccessibility } from "./hooks/useAccessibility";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConnectionStore } from "./stores/useConnectionStore";
import { useMediaStream } from "./hooks/useMediaStream";

function HomePage() {
  const { screenReaderActive, prefersReducedMotion } = useAccessibility();
  const { send } = useWebSocket();
  const { status, latency } = useConnectionStore();
  const {
    cameraStream,
    isCapturing,
    isFrameCaptureActive,
    videoRef,
    startCamera,
    stopCamera,
  } = useMediaStream();

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 1rem",
        gap: "2rem",
      }}
    >
      {/* 隐藏的 video 元素用于帧捕获 */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      <StatusBadge status={status} latency={latency} />

      <h1>AI视觉对话助手</h1>
      <p>点击下方麦克风按钮开始对话</p>

      {/* 摄像头控制 */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <IconButton
          label={isCapturing ? "关闭摄像头" : "打开摄像头"}
          icon={isCapturing ? "📷✅" : "📷"}
          size="normal"
          active={isCapturing}
          onClick={() => {
            if (isCapturing) {
              stopCamera();
            } else {
              startCamera().catch(() => {});
            }
          }}
        />
        <span
          style={{ fontSize: "0.85rem", color: "var(--color-fg-secondary)" }}
        >
          {isCapturing
            ? isFrameCaptureActive
              ? "📡 帧传输中 (每2秒)"
              : "📷 摄像头已开启"
            : "点击开启摄像头"}
        </span>
      </div>

      <VoiceIndicator status="idle" />

      <IconButton
        label="按住开始语音对话"
        icon="🎤"
        size="large"
        onClick={() => {
          send("user.query", {
            query_id: crypto.randomUUID(),
            text: "测试消息",
          });
        }}
      />

      {screenReaderActive && (
        <p style={{ color: "var(--color-success)", fontSize: "0.9rem" }}>
          ✅ 屏幕阅读器兼容模式已激活
        </p>
      )}
      {prefersReducedMotion && (
        <p style={{ color: "var(--color-warning)", fontSize: "0.9rem" }}>
          🎯 已启用减弱动画模式
        </p>
      )}

      <CameraPreview stream={cameraStream} isStreaming={isFrameCaptureActive} />
    </main>
  );
}

function SettingsPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>设置</h1>
      <p>设置页面即将上线</p>
    </main>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

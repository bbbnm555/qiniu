import { Routes, Route } from "react-router-dom";
import { useCallback } from "react";
import AppShell from "./components/layout/AppShell";
import IconButton from "./components/ui/IconButton";
import VoiceIndicator from "./components/ui/VoiceIndicator";
import StatusBadge from "./components/ui/StatusBadge";
import CameraPreview from "./components/ui/CameraPreview";
import { useAccessibility } from "./hooks/useAccessibility";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConnectionStore } from "./stores/useConnectionStore";
import { useMediaStream } from "./hooks/useMediaStream";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useAudioOutput } from "./hooks/useAudioOutput";

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

  const handleVoiceResult = useCallback(
    (text: string) => {
      send("user.query", {
        query_id: crypto.randomUUID(),
        text,
      });
    },
    [send],
  );

  const {
    transcript,
    isListening,
    isSupported: voiceSupported,
    start: startVoice,
    stop: stopVoice,
  } = useVoiceRecognition(handleVoiceResult);

  // 激活音频播放（监听 WS Binary 帧）
  useAudioOutput();

  const voiceStatus = isListening
    ? "listening"
    : transcript
      ? "processing"
      : "idle";

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
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      <StatusBadge status={status} latency={latency} />

      <h1>AI视觉对话助手</h1>
      <p>
        {voiceSupported
          ? "点击麦克风按钮开始语音对话"
          : "浏览器不支持语音识别，请在 Chrome/Edge 中打开"}
      </p>

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

      <VoiceIndicator status={voiceStatus as never} transcript={transcript} />

      <IconButton
        label={isListening ? "正在听取，点击停止" : "点击开始语音对话"}
        icon="🎤"
        size="large"
        active={isListening}
        pulse={isListening}
        onClick={() => {
          if (isListening) {
            stopVoice();
          } else {
            startVoice();
          }
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
      {!voiceSupported && (
        <p style={{ color: "var(--color-danger)", fontSize: "0.85rem" }}>
          ⚠️ 当前浏览器不支持 SpeechRecognition，请使用 Chrome 或 Edge
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

import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import IconButton from "./components/ui/IconButton";
import VoiceIndicator from "./components/ui/VoiceIndicator";
import StatusBadge from "./components/ui/StatusBadge";
import CameraPreview from "./components/ui/CameraPreview";
import { useAccessibility } from "./hooks/useAccessibility";

function HomePage() {
  const { screenReaderActive, prefersReducedMotion } = useAccessibility();

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
      <StatusBadge status="disconnected" />

      <h1>AI视觉对话助手</h1>
      <p>点击下方麦克风按钮开始对话</p>

      <VoiceIndicator status="idle" />

      <IconButton
        label="按住开始语音对话"
        icon="🎤"
        size="large"
        onClick={() => {
          // TODO: Task-07 集成语音识别
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

      <CameraPreview stream={null} />
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

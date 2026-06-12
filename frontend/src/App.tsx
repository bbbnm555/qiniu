import { Routes, Route } from "react-router-dom";
import { useCallback, useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import IconButton from "./components/ui/IconButton";
import VoiceIndicator from "./components/ui/VoiceIndicator";
import StatusBadge from "./components/ui/StatusBadge";
import CameraPreview from "./components/ui/CameraPreview";
import ConversationPanel from "./components/conversation/ConversationPanel";
import { useAccessibility } from "./hooks/useAccessibility";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConnectionStore } from "./stores/useConnectionStore";
import { useConversationStore } from "./stores/useConversationStore";
import { useMediaStream } from "./hooks/useMediaStream";
import { useVoiceRecognition } from "./hooks/useVoiceRecognition";
import { useAudioOutput } from "./hooks/useAudioOutput";
import { useSettingsStore } from "./stores/useSettingsStore";
import {
  WS_EVENTS,
  type ResponseTextPayload,
  type ErrorPayload,
} from "./services/websocket/messageTypes";

function HomePage() {
  const { send, subscribe } = useWebSocket();
  const { status, latency } = useConnectionStore();
  const {
    cameraStream,
    isCapturing,
    isFrameCaptureActive,
    videoRef,
    startCamera,
    stopCamera,
  } = useMediaStream();

  const {
    messages,
    isProcessing,
    activeQueryId,
    error,
    addMessage,
    appendToLast,
    setIsProcessing,
    setActiveQueryId,
    setError,
    clearHistory,
  } = useConversationStore();

  useAudioOutput();

  // 订阅 WS response.text + error
  useEffect(() => {
    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;
      if (data.is_final) {
        setIsProcessing(false);
        setActiveQueryId(null);
        return;
      }

      const lastMsg = messages[messages.length - 1];
      if (
        !lastMsg ||
        lastMsg.role !== "assistant" ||
        lastMsg.queryId !== data.query_id
      ) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.text,
          timestamp: Date.now(),
          queryId: data.query_id,
          hasAudio: true,
        });
      } else {
        appendToLast(data.text);
      }
    });

    const unsubErr = subscribe(WS_EVENTS.ERROR, (payload) => {
      const data = payload as ErrorPayload;
      setError(data.message);
      setIsProcessing(false);
      setActiveQueryId(null);
    });

    return () => {
      unsub();
      unsubErr();
    };
  }, [
    subscribe,
    addMessage,
    appendToLast,
    setIsProcessing,
    setActiveQueryId,
    setError,
    messages,
  ]);

  // 语音识别 → 发送 user.query（自动中断上一个）
  const handleVoiceResult = useCallback(
    (text: string) => {
      setError(null);

      // 如果正在处理，先取消上一个
      if (activeQueryId && isProcessing) {
        send(WS_EVENTS.QUERY_CANCEL, { query_id: activeQueryId });
      }

      const queryId = crypto.randomUUID();
      setActiveQueryId(queryId);

      addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
        queryId,
      });

      send(WS_EVENTS.USER_QUERY, { query_id: queryId, text });
      setIsProcessing(true);
    },
    [
      send,
      addMessage,
      setIsProcessing,
      setActiveQueryId,
      setError,
      activeQueryId,
      isProcessing,
    ],
  );

  const {
    transcript,
    isListening,
    isSupported: voiceSupported,
    start: startVoice,
    stop: stopVoice,
  } = useVoiceRecognition(handleVoiceResult);

  const voiceStatus = isListening
    ? "listening"
    : isProcessing
      ? "processing"
      : "idle";

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem",
        gap: "1rem",
        height: "100vh",
        maxHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      <StatusBadge status={status} latency={latency} />

      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>AI视觉对话助手</h1>

      {/* 错误提示 */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "0.5rem 1rem",
            background: "var(--color-danger)",
            color: "white",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "0.5rem",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            aria-label="关闭错误提示"
          >
            ✕
          </button>
        </div>
      )}

      <ConversationPanel
        messages={messages}
        header={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem" }}>对话历史</span>
            <button
              onClick={clearHistory}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
              aria-label="清空对话历史"
            >
              清空
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          padding: "0.5rem 0",
        }}
      >
        <IconButton
          label={isCapturing ? "关闭摄像头" : "打开摄像头"}
          icon={isCapturing ? "📷✅" : "📷"}
          size="normal"
          active={isCapturing}
          onClick={() => {
            if (isCapturing) stopCamera();
            else startCamera().catch(() => {});
          }}
        />

        <VoiceIndicator status={voiceStatus as never} transcript={transcript} />

        <IconButton
          label={isListening ? "正在听取..." : "开始语音对话"}
          icon="🎤"
          size="large"
          active={isListening}
          pulse={isListening}
          disabled={isProcessing && !isListening}
          onClick={() => {
            if (isListening) stopVoice();
            else startVoice();
          }}
        />
      </div>

      {!voiceSupported && (
        <p
          style={{
            color: "var(--color-danger)",
            fontSize: "0.75rem",
            margin: 0,
          }}
        >
          ⚠️ 请使用 Chrome 或 Edge
        </p>
      )}

      <CameraPreview stream={cameraStream} isStreaming={isFrameCaptureActive} />
    </main>
  );
}

function SettingsPage() {
  const { ttsSpeed, ttsVolume, theme, setTTSSpeed, setTTSVolume, setTheme } =
    useSettingsStore();

  return (
    <main style={{ padding: "2rem", maxWidth: 400, margin: "0 auto" }}>
      <h1>设置</h1>

      <label style={{ display: "block", marginTop: "1.5rem" }}>
        🗣️ TTS 语速: {ttsSpeed.toFixed(1)}x
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={ttsSpeed}
          onChange={(e) => setTTSSpeed(parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: "0.5rem" }}
          aria-label="语音合成语速"
        />
      </label>

      <label style={{ display: "block", marginTop: "1.5rem" }}>
        🔊 TTS 音量: {Math.round(ttsVolume * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={ttsVolume}
          onChange={(e) => setTTSVolume(parseFloat(e.target.value))}
          style={{ width: "100%", marginTop: "0.5rem" }}
          aria-label="语音合成音量"
        />
      </label>

      <fieldset
        style={{
          marginTop: "1.5rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "1rem",
        }}
      >
        <legend>🎨 主题</legend>
        {[
          { value: "normal" as const, label: "标准" },
          { value: "dark" as const, label: "深色" },
          { value: "high-contrast" as const, label: "高对比度" },
        ].map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0",
              fontSize: "1.1rem",
            }}
          >
            <input
              type="radio"
              name="theme"
              value={opt.value}
              checked={theme === opt.value}
              onChange={() => setTheme(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
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

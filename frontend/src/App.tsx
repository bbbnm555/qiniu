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
import {
  WS_EVENTS,
  type ResponseTextPayload,
} from "./services/websocket/messageTypes";

function HomePage() {
  const { screenReaderActive, prefersReducedMotion } = useAccessibility();
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
    addMessage,
    appendToLast,
    setIsProcessing,
    clearHistory,
  } = useConversationStore();

  useAudioOutput();

  // 订阅 WS response.text → 追加到对话
  useEffect(() => {
    const unsub = subscribe(WS_EVENTS.RESPONSE_TEXT, (payload) => {
      const data = payload as ResponseTextPayload;

      if (data.is_final) {
        setIsProcessing(false);
        return;
      }

      // 第一个句子：新增消息
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
        // 后续句子：追加
        appendToLast(data.text);
      }
    });

    // 订阅 WS status → 处理状态
    const unsubStatus = subscribe(WS_EVENTS.STATUS, (payload) => {
      const data = payload as { status: string };
      if (data.status === "speaking") {
        // TTS 播放中
      }
    });

    return () => {
      unsub();
      unsubStatus();
    };
  }, [subscribe, addMessage, appendToLast, setIsProcessing, messages]);

  // 语音识别 → 发送 user.query + 添加用户消息
  const handleVoiceResult = useCallback(
    (text: string) => {
      const queryId = crypto.randomUUID();

      // 添加用户消息
      addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
        queryId,
      });

      // 发送到后端
      send(WS_EVENTS.USER_QUERY, { query_id: queryId, text });
      setIsProcessing(true);
    },
    [send, addMessage, setIsProcessing],
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

      {/* 对话面板 */}
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

      {/* 操作栏 */}
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
          label={isListening ? "正在听取，点击停止" : "点击开始语音对话"}
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

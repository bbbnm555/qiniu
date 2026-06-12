import { Routes, Route } from "react-router-dom";
import { useCallback, useEffect } from "react";
import AppShell from "./components/layout/AppShell";
import IconButton from "./components/ui/IconButton";
import VoiceIndicator from "./components/ui/VoiceIndicator";
import StatusBadge from "./components/ui/StatusBadge";
import CameraPreview from "./components/ui/CameraPreview";
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
import styles from "./App.module.css";

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

  const { ttsEngine } = useSettingsStore();
  useAudioOutput(ttsEngine);

  // 引擎切换同步到后端
  useEffect(() => {
    send(WS_EVENTS.SETTINGS_UPDATE, { tts_engine: ttsEngine });
  }, [ttsEngine, send]);

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

  const handleVoiceResult = useCallback(
    (text: string) => {
      console.log("[Voice] 识别结果:", text);
      setError(null);
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
      console.log("[Voice] 发送 user.query, queryId:", queryId);
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "t" || e.key === "T") && !e.repeat) {
        e.preventDefault();
        if (!isListening && !isProcessing) startVoice();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (isListening) stopVoice();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isListening, isProcessing, startVoice, stopVoice]);

  const voiceStatus = isListening
    ? "listening"
    : isProcessing
      ? "processing"
      : "idle";

  return (
    <div className={styles.page}>
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      <div className={styles.topBar}>
        <StatusBadge status={status} latency={latency} />
        <h1 className={styles.title}>
          Vision<span className={styles.titleAccent}>Talk</span>
        </h1>
      </div>

      {error && (
        <div className={styles.errorAlert} role="alert">
          ⚠ {error}
          <button
            className={styles.errorDismiss}
            onClick={() => setError(null)}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      )}

      <div className={styles.mainArea}>
        <CameraPreview
          stream={cameraStream}
          isStreaming={isFrameCaptureActive}
        />
      </div>

      <div className={styles.bottomArea}>
        <div className={styles.controls}>
          <VoiceIndicator
            status={voiceStatus as never}
            transcript={transcript}
          />

          <div className={styles.buttonRow}>
            <IconButton
              label={isCapturing ? "关闭摄像头" : "打开摄像头"}
              icon={isCapturing ? "📷" : "📷"}
              size="normal"
              active={isCapturing}
              onClick={() => {
                isCapturing ? stopCamera() : startCamera().catch(() => {});
              }}
            />

            <IconButton
              label={isListening ? "正在听取..." : "按住说话"}
              icon="🎤"
              size="large"
              active={isListening}
              pulse={isListening}
              disabled={isProcessing && !isListening}
              onMouseDown={() => {
                if (!isProcessing) startVoice();
              }}
              onMouseUp={() => {
                if (isListening) stopVoice();
              }}
              onMouseLeave={() => {
                if (isListening) stopVoice();
              }}
            />
          </div>

          {transcript && (
            <p
              style={{
                color: "var(--color-accent)",
                fontSize: "0.9rem",
                margin: 0,
              }}
            >
              "{transcript}"
            </p>
          )}
          <p className={styles.hint}>
            按住 <kbd className={styles.key}>T</kbd> 键说话 · 松开停止
          </p>

          {/* 调试：文本输入框 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector(
                "input",
              );
              if (input?.value.trim()) {
                handleVoiceResult(input.value.trim());
                input.value = "";
              }
            }}
            style={{
              display: "flex",
              gap: "0.5rem",
              width: "100%",
              maxWidth: 420,
            }}
          >
            <input
              type="text"
              placeholder="或在此输入文字测试..."
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: "20px",
                border: "1px solid var(--color-border-light)",
                background: "var(--color-bg-surface)",
                color: "var(--color-fg)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "1px solid var(--color-accent)",
                background: "rgba(212,168,83,0.1)",
                color: "var(--color-accent)",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.85rem",
              }}
            >
              发送
            </button>
          </form>

          {!voiceSupported && (
            <p className={styles.unsupported}>⚠ 请使用 Chrome 或 Edge 浏览器</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const {
    ttsSpeed,
    ttsVolume,
    ttsEngine,
    theme,
    setTTSSpeed,
    setTTSVolume,
    setTTSEngine,
    setTheme,
  } = useSettingsStore();

  return (
    <div className={styles.settingsPage}>
      <h1 className={styles.settingsTitle}>设置</h1>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          <span>TTS 语速</span>
          <span className={styles.fieldValue}>{ttsSpeed.toFixed(1)}×</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={ttsSpeed}
          onChange={(e) => setTTSSpeed(parseFloat(e.target.value))}
          className={styles.slider}
          aria-label="语音合成语速"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          <span>TTS 音量</span>
          <span className={styles.fieldValue}>
            {Math.round(ttsVolume * 100)}%
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={ttsVolume}
          onChange={(e) => setTTSVolume(parseFloat(e.target.value))}
          className={styles.slider}
          aria-label="语音合成音量"
        />
      </div>

      <fieldset className={styles.themeGroup}>
        <legend className={styles.themeLegend}>语音引擎</legend>
        {[
          { value: "cosyvoice" as const, label: "cosyvoice（云端高音质）" },
          { value: "browser" as const, label: "浏览器内置（免费）" },
        ].map((opt) => (
          <label key={opt.value} className={styles.radioRow}>
            <input
              type="radio"
              name="ttsEngine"
              value={opt.value}
              checked={ttsEngine === opt.value}
              onChange={() => setTTSEngine(opt.value)}
              className={styles.radio}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.themeGroup}>
        <legend className={styles.themeLegend}>主题</legend>
        {[
          { value: "normal" as const, label: "暗色工业" },
          { value: "dark" as const, label: "深邃暗黑" },
          { value: "high-contrast" as const, label: "高对比度" },
        ].map((opt) => (
          <label key={opt.value} className={styles.radioRow}>
            <input
              type="radio"
              name="theme"
              value={opt.value}
              checked={theme === opt.value}
              onChange={() => setTheme(opt.value)}
              className={styles.radio}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
    </div>
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

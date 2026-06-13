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
import { useWakeWord } from "./hooks/useWakeWord";
import { useAudioFeedback } from "./hooks/useAudioFeedback";
import { useSettingsStore } from "./stores/useSettingsStore";
import {
  WS_EVENTS,
  type ResponseTextPayload,
  type ErrorPayload,
} from "./services/websocket/messageTypes";
import styles from "./App.module.css";

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "14px 20px",
  borderRadius: "28px",
  border: "2px solid var(--color-border)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-fg)",
  fontSize: "1.125rem",
  outline: "none",
  fontFamily: "var(--font-sans)",
  minHeight: "56px",
};

const sendBtnStyle: React.CSSProperties = {
  padding: "14px 28px",
  borderRadius: "28px",
  border: "2px solid var(--color-accent)",
  background: "var(--color-accent)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "1.125rem",
  minHeight: "56px",
  whiteSpace: "nowrap",
};

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

  const { ttsEngine, inputMode } = useSettingsStore();
  useAudioOutput(ttsEngine);
  const { announce } = useAudioFeedback();

  // WS 连接状态 → 语音提示
  useEffect(() => {
    if (status === "connected") {
      const hint =
        inputMode === "wake"
          ? "连接成功，说你好V T唤醒我"
          : "连接成功，按住T键说话";
      announce(hint, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 语音唤醒：你好VT → 自动开启摄像头
  const handleWake = useCallback(() => {
    announce("你好，正在为您开启摄像头", true);
    setTimeout(() => {
      startCamera()
        .then(() => announce("摄像头已开启，请提问"))
        .catch(() => announce("摄像头开启失败"));
    }, 800);
  }, [announce, startCamera]);

  // 唤醒后自动提交的语音查询
  const handleVoiceResult = useCallback(
    (text: string) => {
      setError(null);
      if (activeQueryId && isProcessing)
        send(WS_EVENTS.QUERY_CANCEL, { query_id: activeQueryId });
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

  // 语音唤醒：wake 模式 → 唤醒+自动问答；push 模式 → 仅唤醒开摄像头
  useWakeWord({
    onWake: handleWake,
    onQuery: handleVoiceResult,
    enabled: inputMode === "wake",
  });

  // wake 模式下：唤醒后自动进入语音问答（不用按 T）
  const {
    transcript,
    isListening,
    isSupported: voiceSupported,
    start: startVoice,
    stop: stopVoice,
  } = useVoiceRecognition(handleVoiceResult);

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

  // push 模式：按住 T 键说话
  useEffect(() => {
    if (inputMode !== "push") return;
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

      {/* 文字输入 — 摄像头与按钮之间 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const inp = (e.target as HTMLFormElement).querySelector("input");
          if (inp?.value.trim()) {
            handleVoiceResult(inp.value.trim());
            inp.value = "";
          }
        }}
        style={{
          display: "flex",
          gap: "0.75rem",
          width: "100%",
          maxWidth: 640,
          flexShrink: 0,
        }}
      >
        <input type="text" placeholder="输入文字提问..." style={inputStyle} />
        <button type="submit" style={sendBtnStyle}>
          发送
        </button>
      </form>

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
                fontSize: "1.125rem",
                margin: 0,
                fontWeight: 500,
              }}
            >
              "{transcript}"
            </p>
          )}
          <p className={styles.hint}>
            {inputMode === "push" ? (
              <>
                按住 <kbd className={styles.key}>T</kbd> 键说话 · 松开停止
              </>
            ) : (
              <>
                说 <kbd className={styles.key}>你好VT</kbd> 唤醒 · 然后直接提问
              </>
            )}
          </p>
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
    inputMode,
    theme,
    setTTSSpeed,
    setTTSVolume,
    setTTSEngine,
    setInputMode,
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
        <legend className={styles.themeLegend}>麦克风模式</legend>
        {[
          { value: "wake" as const, label: "常开（语音唤醒）" },
          { value: "push" as const, label: "按键触发（按住 T）" },
        ].map((opt) => (
          <label key={opt.value} className={styles.radioRow}>
            <input
              type="radio"
              name="inputMode"
              value={opt.value}
              checked={inputMode === opt.value}
              onChange={() => setInputMode(opt.value)}
              className={styles.radio}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

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

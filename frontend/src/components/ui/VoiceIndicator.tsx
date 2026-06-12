import styles from "./VoiceIndicator.module.css";

interface VoiceIndicatorProps {
  /** 当前状态 */
  status: "idle" | "listening" | "processing" | "speaking";
  /** 语音识别中间文本（实时反馈） */
  transcript?: string;
}

const statusLabels: Record<VoiceIndicatorProps["status"], string> = {
  idle: "就绪",
  listening: "正在听取...",
  processing: "正在理解...",
  speaking: "正在回答...",
};

export default function VoiceIndicator({
  status,
  transcript,
}: VoiceIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={styles.waveform}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`${styles.bar} ${styles[status]}`}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className={styles.label}>{statusLabels[status]}</span>
      {transcript && <span className={styles.transcript}>"{transcript}"</span>}
    </div>
  );
}

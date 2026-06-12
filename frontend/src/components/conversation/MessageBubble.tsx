import { useState, useMemo } from "react";
import type { Message } from "../../types/conversation";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: Message;
  onReplay?: () => void;
}

/** 根据文本长度模拟语音时长（字/3.5 ≈ 秒） */
function estimateDuration(text: string): number {
  return Math.max(1, Math.round(text.length / 3.5));
}

/** 生成随机高度的波形条 */
function generateBars(count: number): number[] {
  return Array.from({ length: count }, () => 0.3 + Math.random() * 0.7);
}

export default function MessageBubble({
  message,
  onReplay,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [isPlaying, setIsPlaying] = useState(false);
  const duration = estimateDuration(message.content);
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 稳定波形（不随渲染变化）
  const bars = useMemo(
    () => generateBars(Math.min(30, Math.max(8, message.content.length))),
    [message.content.length],
  );

  const handleClick = () => {
    if (onReplay) {
      setIsPlaying(true);
      onReplay();
      setTimeout(() => setIsPlaying(false), duration * 1000);
    }
  };

  return (
    <div
      className={`${styles.bubble} ${isUser ? styles.user : styles.assistant} ${isPlaying ? styles.playing : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${isUser ? "你的" : "AI"}语音消息，${duration}秒，${message.content}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className={styles.avatar} aria-hidden="true">
        {isUser ? "👤" : "◈"}
      </div>

      <div className={styles.waveform} aria-hidden="true">
        {bars.map((h, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height: `${h * 100}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.meta}>
        <span className={styles.playIcon}>{isPlaying ? "🔊" : "▶"}</span>
        <span className={styles.duration}>{duration}"</span>
        <span className={styles.time}>{time}</span>
      </div>

      {/* 屏幕阅读器可读 */}
      <span className={styles.srText}>{message.content}</span>
    </div>
  );
}

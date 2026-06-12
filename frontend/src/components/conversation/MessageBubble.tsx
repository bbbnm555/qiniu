import type { Message } from "../../types/conversation";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: Message;
  onReplay?: () => void;
}

export default function MessageBubble({
  message,
  onReplay,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}
      role="listitem"
      aria-label={`${isUser ? "你" : "AI助手"}说：${message.content}`}
    >
      <div className={styles.avatar} aria-hidden="true">
        {isUser ? "👤" : "🤖"}
      </div>
      <div className={styles.content}>
        <div className={styles.text}>{message.content}</div>
        <div className={styles.meta}>
          <span className={styles.time}>{time}</span>
          {!isUser && message.hasAudio && onReplay && (
            <button
              className={styles.replayBtn}
              onClick={onReplay}
              aria-label="重新播放语音"
            >
              🔊 重播
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

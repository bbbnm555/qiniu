import { useEffect, useRef } from "react";
import type { Message } from "../../types/conversation";
import MessageBubble from "./MessageBubble";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: Message[];
  onReplayMessage?: (message: Message) => void;
}

export default function MessageList({
  messages,
  onReplayMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <span className={styles.emptyIcon} aria-hidden="true">
          ◈
        </span>
        <p className={styles.emptyTitle}>准备好开始对话</p>
        <p className={styles.emptyHint}>
          打开摄像头让 AI 看到你的环境，然后说话提问
        </p>
        <div className={styles.kbdHint}>
          按住 <span className={styles.kbdKey}>T</span> 键开始
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list} role="list" aria-label="对话历史">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onReplay={onReplayMessage ? () => onReplayMessage(msg) : undefined}
        />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}

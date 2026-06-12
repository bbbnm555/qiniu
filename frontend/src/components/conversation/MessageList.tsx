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

  // 自动滚底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.empty} role="status">
        <span className={styles.emptyIcon}>🎙️</span>
        <p>点击麦克风按钮开始语音对话</p>
        <p className={styles.hint}>打开摄像头后，AI 可以看到你面前的环境</p>
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

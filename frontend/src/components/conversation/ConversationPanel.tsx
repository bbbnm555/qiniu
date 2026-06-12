import MessageList from "./MessageList";
import type { Message } from "../../types/conversation";
import styles from "./ConversationPanel.module.css";

interface ConversationPanelProps {
  messages: Message[];
  onReplayMessage?: (message: Message) => void;
  header?: React.ReactNode;
}

export default function ConversationPanel({
  messages,
  onReplayMessage,
  header,
}: ConversationPanelProps) {
  return (
    <div className={styles.panel} role="region" aria-label="对话面板">
      {header && <div className={styles.header}>{header}</div>}
      <MessageList messages={messages} onReplayMessage={onReplayMessage} />
    </div>
  );
}

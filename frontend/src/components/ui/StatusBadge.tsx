import styles from "./StatusBadge.module.css";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

interface StatusBadgeProps {
  status: ConnectionStatus;
  latency?: number;
}

const statusConfig: Record<
  ConnectionStatus,
  { label: string; dotClass: string }
> = {
  connecting: { label: "连接中", dotClass: styles.dotConnecting },
  connected: { label: "已连接", dotClass: styles.dotConnected },
  disconnected: { label: "未连接", dotClass: styles.dotDisconnected },
  reconnecting: { label: "重连中", dotClass: styles.dotReconnecting },
};

export default function StatusBadge({ status, latency }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      className={styles.badge}
      role="status"
      aria-label={`连接状态：${config.label}${latency ? `，延迟 ${latency} 毫秒` : ""}`}
    >
      <span className={`${styles.dot} ${config.dotClass}`} aria-hidden="true" />
      <span className={styles.label}>{config.label}</span>
      {latency != null && status === "connected" && (
        <span className={styles.latency}>{latency}ms</span>
      )}
    </div>
  );
}

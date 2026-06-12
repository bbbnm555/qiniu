import { type ButtonHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 无障碍标签（屏幕阅读器必读） */
  label: string;
  /** 图标 emoji 或文字 */
  icon: string;
  /** 按钮尺寸 */
  size?: "normal" | "large";
  /** 是否为活跃状态（如录音中） */
  active?: boolean;
  /** 是否显示脉冲动画 */
  pulse?: boolean;
}

export default function IconButton({
  label,
  icon,
  size = "normal",
  active = false,
  pulse = false,
  className = "",
  ...props
}: IconButtonProps) {
  const sizeClass = size === "large" ? styles.large : styles.normal;

  return (
    <button
      className={`${styles.button} ${sizeClass} ${active ? styles.active : ""} ${pulse ? styles.pulse : ""} ${className}`}
      aria-label={label}
      aria-pressed={active}
      type="button"
      {...props}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <header className={styles.header} role="banner">
        <Link to="/" className={styles.brand} aria-label="AI视觉对话助手，首页">
          <span className={styles.brandIcon} aria-hidden="true">
            ◈
          </span>
          <span className={styles.brandText}>
            Vision<span className={styles.brandAccent}>Talk</span>
          </span>
        </Link>
        <nav aria-label="主导航">
          <Link to="/settings" className={styles.navLink} aria-label="设置">
            <span aria-hidden="true">⚙</span> 设置
          </Link>
        </nav>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

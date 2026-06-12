import { Link } from "react-router-dom";
import { type ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell" data-theme="normal">
      {/* 跳过导航链接 - 屏幕阅读器友好 */}
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>

      {/* 屏幕阅读器实时播报区域 */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <header className="app-header" role="banner">
        <nav aria-label="主导航">
          <Link to="/" aria-label="AI视觉对话助手，首页">
            <h1>🎙️ AI视觉对话助手</h1>
          </Link>
          <Link to="/settings" aria-label="设置">
            ⚙️
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

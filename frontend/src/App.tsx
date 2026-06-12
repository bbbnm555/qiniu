import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

function HomePage() {
  return (
    <main>
      <h1>AI视觉对话助手</h1>
      <p>点击下方麦克风按钮开始对话</p>
    </main>
  );
}

function SettingsPage() {
  return (
    <main>
      <h1>设置</h1>
      <p>设置页面即将上线</p>
    </main>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  );
}

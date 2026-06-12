import { useState, useEffect, useCallback } from "react";

interface AccessibilityState {
  /** 屏幕阅读器是否激活 */
  screenReaderActive: boolean;
  /** 是否偏好减少动画 */
  prefersReducedMotion: boolean;
  /** 是否偏好高对比度 */
  prefersHighContrast: boolean;
}

/**
 * 检测用户无障碍偏好
 * - 屏幕阅读器：通过 DOM 事件检测
 * - prefers-reduced-motion：CSS media query
 * - prefers-contrast：CSS media query
 */
export function useAccessibility(): AccessibilityState {
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    // 检测 prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(motionQuery.matches);
    const onMotionChange = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    motionQuery.addEventListener("change", onMotionChange);

    // 检测 prefers-contrast
    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    setPrefersHighContrast(contrastQuery.matches);
    const onContrastChange = (e: MediaQueryListEvent) =>
      setPrefersHighContrast(e.matches);
    contrastQuery.addEventListener("change", onContrastChange);

    return () => {
      motionQuery.removeEventListener("change", onMotionChange);
      contrastQuery.removeEventListener("change", onContrastChange);
    };
  }, []);

  // 通过检测焦点导航推断屏幕阅读器可能处于活动状态
  useEffect(() => {
    let lastInputType = "";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        lastInputType = "keyboard";
        setScreenReaderActive(true);
      }
    };

    const onMouseDown = () => {
      // 鼠标操作不一定意味着屏幕阅读器关闭，但 Tab 键操作意味着可能在用
      lastInputType = "mouse";
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  return { screenReaderActive, prefersReducedMotion, prefersHighContrast };
}

/**
 * 语音播报文本（使用浏览器 SpeechSynthesis，作为 aria-live 的补充）
 */
export function useSpeak() {
  const speak = useCallback(
    (text: string, priority: "high" | "normal" = "normal") => {
      if (!window.speechSynthesis) return;

      // 高优先级：取消当前播报
      if (priority === "high") {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [],
  );

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, cancel };
}

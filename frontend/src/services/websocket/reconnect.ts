/**
 * 指数退避重连策略
 *
 * 延迟序列: 1s → 2s → 4s → 8s → 16s → 32s (max)
 */

const MAX_DELAY = 32_000;
const BASE_DELAY = 1_000;

export function getReconnectDelay(attempt: number): number {
  const exponentialDelay = BASE_DELAY * Math.pow(2, attempt);
  return Math.min(exponentialDelay, MAX_DELAY);
}

export function createReconnectTimer(
  callback: () => void,
  attempt: number,
): () => void {
  const delay = getReconnectDelay(attempt);
  const timerId = window.setTimeout(callback, delay);

  return () => window.clearTimeout(timerId);
}

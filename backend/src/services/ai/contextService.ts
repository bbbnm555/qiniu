/**
 * 对话上下文管理
 *
 * 每个 session 保留最近 N 轮对话，用于多模态 AI 的多轮理解
 */

interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_CONTEXT_ROUNDS = 5; // 保留最近 5 轮对话

export class ContextService {
  private messages: ContextMessage[] = [];

  /** 添加一轮对话 */
  addUserMessage(text: string): void {
    this.messages.push({ role: "user", content: text });
    this.trim();
  }

  addAssistantMessage(text: string): void {
    this.messages.push({ role: "assistant", content: text });
    this.trim();
  }

  /** 获取上下文（最近 N 轮） */
  getContext(): ContextMessage[] {
    return [...this.messages];
  }

  /** 清空上下文 */
  clear(): void {
    this.messages = [];
  }

  /** 限制上下文轮数 */
  private trim(): void {
    // 每轮 = 1 user + 1 assistant = 2 条消息
    const maxMessages = MAX_CONTEXT_ROUNDS * 2;
    while (this.messages.length > maxMessages) {
      this.messages.shift();
    }
  }
}

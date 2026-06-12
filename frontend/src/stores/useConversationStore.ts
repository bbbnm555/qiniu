import { create } from "zustand";
import type { Message } from "../types/conversation";

interface ConversationState {
  messages: Message[];
  isProcessing: boolean;

  addMessage: (msg: Message) => void;
  /** 更新最后一条消息（用于流式追加内容） */
  appendToLast: (content: string) => void;
  setIsProcessing: (v: boolean) => void;
  clearHistory: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isProcessing: false,

  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),

  appendToLast: (content: string) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),

  setIsProcessing: (v) => set({ isProcessing: v }),

  clearHistory: () => set({ messages: [], isProcessing: false }),
}));

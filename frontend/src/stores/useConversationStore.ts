import { create } from "zustand";
import type { Message } from "../types/conversation";

interface ConversationState {
  messages: Message[];
  isProcessing: boolean;
  activeQueryId: string | null;
  error: string | null;

  addMessage: (msg: Message) => void;
  appendToLast: (content: string) => void;
  setIsProcessing: (v: boolean) => void;
  setActiveQueryId: (id: string | null) => void;
  setError: (err: string | null) => void;
  clearHistory: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isProcessing: false,
  activeQueryId: null,
  error: null,

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
  setActiveQueryId: (id) => set({ activeQueryId: id }),
  setError: (err) => set({ error: err }),
  clearHistory: () => set({ messages: [], isProcessing: false, error: null }),
}));

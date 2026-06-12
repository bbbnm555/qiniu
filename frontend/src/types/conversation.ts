export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** 关联的 query_id */
  queryId?: string;
  /** TTS 音频是否可重播 */
  hasAudio?: boolean;
}

export interface ConversationState {
  messages: Message[];
  currentQueryId: string | null;
}

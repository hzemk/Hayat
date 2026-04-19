import { api } from './client';

export type ChatAction =
  | 'NONE'
  | 'CALL_EMERGENCY'
  | 'BOOK_APPOINTMENT'
  | 'READY_FOR_DOCTOR';

export interface ChatSummary {
  text: string;
  specialty: string;
}

export interface SuggestedDoctor {
  id: string;
  fullName: string;
  specialty: string;
  specialtyAr?: string;
  rating?: number;
  yearsExperience?: number;
  hospitalNameEn?: string;
  hospitalNameAr?: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  action: ChatAction;
  category?: string;
  summary?: ChatSummary;
  suggestedDoctors?: SuggestedDoctor[];
}

export async function sendChatMessage(params: { conversationId?: string; message: string }) {
  // AI calls go through Groq/Anthropic which can take 5–30s on first turn.
  // Override the client's default 15s timeout to give the model room to respond.
  const { data } = await api.post<ChatResponse>('/ai/chat', params, {
    timeout: 60_000,
  });
  return data;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  escalated: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listConversations() {
  const { data } = await api.get<ConversationSummary[]>('/ai/conversations');
  return data;
}

export interface AiMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  redFlag: boolean;
  createdAt: string;
}

export async function getConversation(id: string) {
  const { data } = await api.get<ConversationSummary & { messages: AiMessage[] }>(
    `/ai/conversations/${id}`,
  );
  return data;
}

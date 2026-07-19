import type { ChatServiceMessage } from '../../utils/chatService';
import type { ContextSources } from '../../utils/agentContext';

export interface ChatMessage extends ChatServiceMessage {
  id: string;
  status?: 'streaming' | 'done' | 'error';
  contextSources?: ContextSources;
}

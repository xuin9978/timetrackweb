import React from 'react';
import { Icons } from '../Icons';
import type { ChatMode } from '../../utils/chatService';

interface ChatInputBarProps {
  draft: string;
  chatMode: ChatMode;
  isSending: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onDraftChange: (value: string) => void;
  onChatModeChange: (mode: ChatMode) => void;
  onSubmit: (event: React.FormEvent) => void;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  draft,
  chatMode,
  isSending,
  inputRef,
  onDraftChange,
  onChatModeChange,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-[0_16px_44px_rgba(15,23,42,0.08)] transition focus-within:border-gray-300"
  >
    <input
      ref={inputRef}
      value={draft}
      onChange={event => onDraftChange(event.target.value)}
      className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-gray-700 outline-none placeholder:text-gray-400"
      placeholder="问问你的时间 Agent"
      disabled={isSending}
    />
    <button
      type="button"
      aria-label="开启深度思考"
      aria-pressed={chatMode === 'deep'}
      onClick={() => onChatModeChange(chatMode === 'deep' ? 'quick' : 'deep')}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition active:scale-95 ${
        chatMode === 'deep'
          ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
          : 'border-gray-200 bg-white text-[#111111] hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <Icons.Atom size={15} strokeWidth={2.2} />
      <span>深度思考</span>
    </button>
    <button
      type="submit"
      aria-label="发送消息"
      disabled={!draft.trim() || isSending}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD6C4] text-white transition hover:bg-[#ffc8b0] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200"
    >
      {isSending ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <Icons.ChevronRight className="-rotate-90" size={20} strokeWidth={2.6} />
      )}
    </button>
  </form>
);

export default ChatInputBar;

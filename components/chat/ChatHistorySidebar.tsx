import React from 'react';
import { Icons } from '../Icons';
import type { ChatSessionRecord } from '../../utils/chatHistoryService';
import { formatChatRelativeTime } from '../../utils/chatHistoryService';

interface ChatHistorySidebarProps {
  sessions: ChatSessionRecord[];
  activeSessionId: string | null;
  searchQuery: string;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRename: (session: ChatSessionRecord) => void;
  onDelete: (session: ChatSessionRecord) => void;
  onTogglePinned: (session: ChatSessionRecord) => void;
  hasSearchResults: boolean;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions,
  activeSessionId,
  searchQuery,
  disabled = false,
  onSearchChange,
  onNewSession,
  onSelectSession,
  onRename,
  onDelete,
  onTogglePinned,
  hasSearchResults,
}) => (
  <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-100 bg-white/70 px-3 py-4">
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-gray-900">历史</h2>
    </div>
    <button
      type="button"
      onClick={onNewSession}
      disabled={disabled}
      className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icons.Plus size={16} strokeWidth={2.2} />
      新对话
    </button>
    <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-gray-400">
      <Icons.Search size={15} strokeWidth={2.1} />
      <input
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="搜索历史"
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-700 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
      />
    </label>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {sessions.map(session => (
        <div
          key={session.id}
          className={`group relative rounded-xl border px-3 py-2.5 transition ${
            session.id === activeSessionId
              ? 'border-gray-900 bg-gray-950 text-white shadow-sm'
              : 'border-transparent text-gray-600 hover:border-gray-100 hover:bg-white'
          } ${disabled ? 'opacity-70' : ''}`}
        >
          <button
            type="button"
            onClick={() => onSelectSession(session.id)}
            disabled={disabled}
            className="block w-full pr-7 text-left disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-1.5">
              {session.pinned && (
                <Icons.Pin size={12} strokeWidth={2.2} className="shrink-0" />
              )}
              <div className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={session.title}>
                {session.title}
              </div>
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${
              session.id === activeSessionId ? 'text-white/60' : 'text-gray-400'
            }`}>
              <span>{formatChatRelativeTime(session.updatedAt)}</span>
              {session.storageScope === 'local' && <span>本机</span>}
              {session.storageScope === 'unsynced' && <span>未同步</span>}
            </div>
          </button>
          <div className={`absolute right-2 top-2 ${session.id === activeSessionId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition`}>
            <details className="relative">
              <summary
                aria-label={`打开 ${session.title} 的会话操作`}
                className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full hover:bg-black/5"
              >
                <Icons.MoreHorizontal size={16} strokeWidth={2.2} />
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-28 rounded-xl border border-gray-100 bg-white p-1 text-gray-700 shadow-lg">
                <button
                  type="button"
                  onClick={() => onRename(session)}
                  disabled={disabled}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icons.Pencil size={13} />
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePinned(session)}
                  disabled={disabled}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icons.Pin size={13} />
                  {session.pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(session)}
                  disabled={disabled}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icons.Trash size={13} />
                  删除
                </button>
              </div>
            </details>
          </div>
        </div>
      ))}
      {searchQuery.trim() && !hasSearchResults && (
        <div className="px-3 py-5 text-center text-xs font-semibold text-gray-400">没有找到相关历史</div>
      )}
    </div>
  </aside>
);

export default ChatHistorySidebar;

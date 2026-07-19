import React from 'react';
import type { ChatSessionRecord } from '../../utils/chatHistoryService';

interface ChatSessionModalsProps {
  renameTarget: ChatSessionRecord | null;
  renameValue: string;
  deleteTarget: ChatSessionRecord | null;
  isBusy?: boolean;
  onRenameValueChange: (value: string) => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

const ChatSessionModals: React.FC<ChatSessionModalsProps> = ({
  renameTarget,
  renameValue,
  deleteTarget,
  isBusy = false,
  onRenameValueChange,
  onCancelRename,
  onSaveRename,
  onCancelDelete,
  onConfirmDelete,
}) => (
  <>
    {renameTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <h3 className="text-base font-bold text-gray-900">重命名会话</h3>
          <input
            value={renameValue}
            onChange={event => onRenameValueChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !isBusy) onSaveRename();
            }}
            className="mt-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-gray-400"
            autoFocus
          />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onCancelRename} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50">取消</button>
            <button type="button" onClick={onSaveRename} disabled={isBusy} className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">保存</button>
          </div>
        </div>
      </div>
    )}
    {deleteTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <h3 className="text-base font-bold text-gray-900">删除会话</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-gray-500">确定删除这个会话吗？删除后不可恢复。</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onCancelDelete} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50">取消</button>
            <button type="button" onClick={onConfirmDelete} disabled={isBusy} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">删除</button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default ChatSessionModals;

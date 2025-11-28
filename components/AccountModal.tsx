import React from 'react';
import GlassCard from './GlassCard';

interface AccountModalProps {
  isOpen: boolean;
  email?: string;
  onClose: () => void;
  onSignOut: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, email, onClose, onSignOut }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]" onClick={onClose} />
      <GlassCard intensity="high" className="w-full max-w-xs relative animate-[modalEnter_0.3s_ease-out] overflow-hidden !rounded-2xl bg-gray-50 shadow-2xl flex flex-col border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-xl">
          <span className="text-black font-semibold text-base">账户</span>
          <button onClick={onClose} className="text-blue-600 hover:text-blue-700 text-sm font-medium">关闭</button>
        </div>
        <div className="p-4 space-y-4 bg-white">
          <div className="text-sm text-gray-600">{email}</div>
          <button onClick={onSignOut} className="w-full py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors">退出登录</button>
        </div>
      </GlassCard>
    </div>
  );
};

export default AccountModal;

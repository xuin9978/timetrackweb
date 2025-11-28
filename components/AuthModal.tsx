import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = mode === 'login'
      ? await onLogin(email.trim(), password)
      : await onRegister(email.trim(), password);
    if (!res.ok) {
      setErrorMessage(res.error || '邮箱或密码错误');
    } else {
      setErrorMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]" onClick={onClose} />
      <GlassCard intensity="high" className="w-full max-w-sm relative animate-[modalEnter_0.3s_ease-out] overflow-hidden !rounded-2xl bg-gray-50 shadow-2xl flex flex-col border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-xl">
          <button onClick={onClose} className="text-blue-600 hover:text-blue-700 text-base font-medium transition-colors px-2">取消</button>
          <span className="text-black font-semibold text-base">{mode === 'login' ? '登陆' : '注册'}</span>
          <button onClick={handleSubmit} className="text-blue-600 hover:text-blue-700 text-base font-bold transition-colors px-2">{mode === 'login' ? '登陆' : '注册'}</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 bg-white">
          <div className="bg-white rounded-xl flex items-center p-3 border border-gray-200 shadow-sm">
            <Icons.User size={18} className="text-gray-400 mr-3" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="邮箱"
              className="flex-1 bg-transparent text-base text-black placeholder-gray-400 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="bg-white rounded-xl flex items-center p-3 border border-gray-200 shadow-sm">
            <Icons.Lock size={18} className="text-gray-400 mr-3" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="flex-1 bg-transparent text-base text-black placeholder-gray-400 focus:outline-none"
            />
          </div>
          {errorMessage && (
            <div className="px-2 text-sm text-red-500">{errorMessage}</div>
          )}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-gray-500 hover:text-black text-sm font-medium">{mode === 'login' ? '没有账号? 去注册' : '已有账号? 去登陆'}</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors">{mode === 'login' ? '登陆' : '注册'}</button>
          </div>

        </form>
      </GlassCard>
    </div>
  );
};

export default AuthModal;

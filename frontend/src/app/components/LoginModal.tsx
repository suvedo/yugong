'use client';

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from './LanguageContext';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (payload: { email: string; code: string }) => Promise<void> | void;
  onCancel?: () => void;
  error?: string;
}

export default function LoginModal({ open, onClose, onLogin, onCancel, error }: LoginModalProps) {
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const { t } = useLanguage();
  
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 当弹窗打开时，清空输入和错误状态
  React.useEffect(() => {
    if (open) {
      setEmail('');
      setCode('');
    }
  }, [open]);

  if (!open) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSendCode = isValidEmail && !sending && countdown === 0;
  const canLogin = isValidEmail && code.trim().length >= 4 && !loggingIn;

  const handleSendCode = async () => {
    if (!canSendCode) return;
    try {
      setSending(true);
      await fetch('/api/auth/send-code', 
        { method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ "request_id": uuidv4(), "to_mail": email }) 
        });
      setCountdown(60);
    } catch {
      // 可在此提示发送失败
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-[#23232a] rounded-lg shadow-lg p-6 w-[360px] max-w-[92vw]">
        <h2 className="text-base font-semibold mb-4 text-white">{t('login_email_title')}</h2>

        <label className="block text-xs text-gray-300 mb-1">{t('login_email')}</label>
          <input
            className="border border-gray-600 bg-[#2b2b32] rounded px-3 py-2 w-full mb-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/40"
            // placeholder="请输入邮箱地址"
            inputMode="email"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

        <label className="block text-xs text-gray-300 mb-1">{t('login_code')}</label>
        <div className="flex gap-2 mb-2">
          <input
            className="border border-gray-600 bg-[#2b2b32] rounded px-3 py-2 flex-1 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/40"
            // placeholder="请输入验证码"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button
            className={`px-3 py-2 rounded text-sm whitespace-nowrap ${canSendCode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            onClick={handleSendCode}
            disabled={!canSendCode}
          >
            {countdown > 0 ? `${t('login_send_code_again')}(${countdown}s)` : sending ? `${t('login_sending')}` : `${t('login_send_code')}`}
          </button>
        </div>

        <div className="flex justify-end items-center relative">
          {/* 错误信息显示 - 绝对定位在左侧 */}
          {error && (
            <div className="absolute left-0 text-red-400 text-xs">
              {error}
            </div>
          )}
          
          <div className="flex gap-2">
            <button 
              className="px-4 py-2 rounded bg-gray-600 text-white text-sm hover:bg-gray-500" 
              onClick={() => {
                onClose();
                onCancel?.();
              }}
            >
              {t('login_cancel')}
            </button>
            <button
              className={`px-4 py-2 rounded text-white text-sm ${canLogin ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'}`}
              onClick={async () => {
                if (!(isValidEmail && code.trim().length >= 4) || loggingIn) return;
                try {
                  setLoggingIn(true);
                  await onLogin({ email, code });
                } finally {
                  setLoggingIn(false);
                }
              }}
              disabled={!canLogin}
            >{t('login_login')}</button>
          </div>
        </div>
      </div>
    </div>
  );
} 
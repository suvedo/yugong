"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import LoginModal from "./LoginModal";
import { v4 as uuidv4 } from "uuid";
import { useLanguage } from "./LanguageContext";

interface AuthContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => void;
  openLogin: (onLoginSuccess?: () => void, onLoginCancel?: () => void) => void;
  closeLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);
  const [onLoginSuccessCallback, setOnLoginSuccessCallback] = useState<(() => void) | undefined>(undefined);
  const [onLoginCancelCallback, setOnLoginCancelCallback] = useState<(() => void) | undefined>(undefined);
  const { t } = useLanguage();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_id");
      if (stored) setUserId(stored);
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    try {
      if (userId) localStorage.setItem("user_id", userId);
      else localStorage.removeItem("user_id");
    } catch {}
  }, [userId]);

  const logout = () => setUserId(null);
  const openLogin = (onLoginSuccess?: () => void, onLoginCancel?: () => void) => {
    setLoginError(undefined); // 清空之前的错误信息
    setOnLoginSuccessCallback(() => onLoginSuccess);
    setOnLoginCancelCallback(() => onLoginCancel);
    setLoginOpen(true);
  };
  const closeLogin = () => {
    setLoginError(undefined); // 关闭时清空错误信息
    setLoginOpen(false);
    // 清空回调
    setOnLoginSuccessCallback(undefined);
    setOnLoginCancelCallback(undefined);
  };

  const value = useMemo(
    () => ({ userId, setUserId, isLoggedIn: !!userId, isLoading, logout, openLogin, closeLogin }),
    [userId, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onCancel={() => {
          // 用户取消登录，执行取消回调
          if (onLoginCancelCallback) {
            onLoginCancelCallback();
          }
        }}
        error={loginError}
        onLogin={async ({ email, code }) => {
          try {
            setLoginError(undefined); // 开始登录时清空错误信息
            const response = await fetch('/api/auth/verify', {
              method: 'POST',
              body: JSON.stringify({ request_id: uuidv4(), to_mail: email, code }),
            });
            const data = await response.json();
            if (response.status === 200) {
              const verify_succeed = data?.verify_succeed;
              if (!verify_succeed) {
                setLoginError(data?.text || t('auth_verify_failed'));
                return;
              }
              const newUserId = data?.user_id;
              if (newUserId) setUserId(newUserId);
              closeLogin();
              // 登录成功后执行回调
              if (onLoginSuccessCallback) {
                onLoginSuccessCallback();
              }
            } else {
              // 显示验证失败的错误信息
              setLoginError(data?.text || t('auth_verify_failed'));
            }
          } catch {
            // 网络错误处理
            setLoginError(t('network_error'));
          }
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
} 
"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from 'uuid';

import Navbar2 from "@/app/components/nav2";
import StarlitBackground from "@/app/components/StarlitBackground";
import FloatingElements from "@/app/components/FloatingElements";
import ModernInput from "@/app/components/ModernInput";
import { useAuth } from '@/app/components/AuthContext';

export default function HomePage() {

  // 搜索框状态
  const [a2aServerUrl, setA2aServerUrl] = useState("");
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 注册结果消息
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const { userId, openLogin, isLoading: authLoading } = useAuth();

  // 生成request_id
  const generateRequestId = () => {
    return uuidv4();
  };

  // 获取用户ID（暂时使用模拟ID，后续需要从实际登录系统获取）
  // const getUserId = () => {
  //   // TODO: 从实际的用户认证系统获取用户ID
  //   return "user_" + Date.now().toString();
  // };

  // 处理表单提交
  const handleSubmit = async (url: string) => {
    if (authLoading) {
      return; // 正在加载时，不执行任何操作
    }
    
    if (!userId) {
      openLogin();
      return;
    }

    if (!url.trim()) return;

    setIsLoading(true);
    setMessage(null); // 清空之前的消息
    
    try {
      const requestData = {
        user_id: userId,
        request_id: generateRequestId(),
        a2a_server_url: url.trim()
      };

      const response = await fetch('/api/a2a-server-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage({ text: '注册失败：' + data.text, type: 'error' });
      } else {
        setMessage({ text: '注册成功，请在‘我的agent’中查看', type: 'success' });
      }
    } catch {
      // 显示失败消息
      setMessage({ text: '注册失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#202235] to-[#252841] text-white text-sm overflow-x-hidden flex flex-col">
        {/* 聊天背景动画 */}
        <StarlitBackground />
        
        {/* 浮动元素 */}
        <FloatingElements />
        
        {/* 动态光效背景 */}
      {/* <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div> */}

      <Navbar2 currentPage="share" />
      
      <main className="flex-1 relative z-10 pt-24 flex flex-col justify-end items-center min-h-screen pb-25">
        {/* 主页面内容 */}
        <>
          {/* 文字内容 */}
          <div className="text-center mb-3 relative">
            {/* 主标题光效背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent blur-xl"></div>
            
            <div className="relative z-10">
              {/* <h1 className="mixed-font text-3xl sm:text-4xl mb-6 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                AI智能体互联网开源社区
              </h1> */}
              
              <div className="mixed-font text-lg font-semibold mb-6 text-gray-300 relative">
                <span className="relative z-10">在此分享你的agent服务</span>
              </div>
            </div>
          </div>

          {/* 输入框区域 */}
          <div className="w-full max-w-2xl mx-auto px-4 mb-20 relative">
            <ModernInput
              placeholder="输入A2A服务的URL以注册"
              value={a2aServerUrl}
              onChange={setA2aServerUrl}
              onSubmit={handleSubmit}
              loading={isLoading}
            />
            
            {/* 消息显示区域 */}
            {message && (
              <div className="absolute left-0 right-0 mt-2 p-3 text-center text-sm font-medium z-10"
                   style={{top: '100%'}}>
                <div className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
                  {message.text.split('\n').map((line, lineIndex) => (
                    <div key={lineIndex}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      </main>
      
      {/* 页脚 */}
      {/* <Footer /> */}
    </div>
  );
}

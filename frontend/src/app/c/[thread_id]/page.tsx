'use client';

import React, { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

import Navbar2 from '@/app/components/nav2';
import Sidebar from '@/app/components/Sidebar';
import ChatArea, { Message } from '@/app/components/ChatArea';
import { useSidebar } from '@/app/components/SidebarContext';
import { useAuth } from '@/app/components/AuthContext';
import { useLanguage } from '@/app/components/LanguageContext';

interface FetchDataProps {
  role?: 'user' | 'assistant';
  content?: string;
  content_type?: string;
  event?: string;
  source?: string;
  agent_id?: string;
  provider_url?: string
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId, openLogin, isLoading: authLoading } = useAuth();
  const threadId = params.thread_id as string;
  const agentName = decodeURIComponent(searchParams.get('agentName') || '');
  const agentOrganization = decodeURIComponent(searchParams.get('agentOrganization') || '');
  const { t } = useLanguage();
  
  // 使用Context中的侧边栏状态
  const { updateChats } = useSidebar();
  
  // 聊天消息
  const [messages, setMessages] = useState<Message[]>([]);
  // 加载状态 - 初始为true，确保页面加载时显示加载图标
  const [isLoading, setIsLoading] = useState(true);
  // 登录弹窗由 AuthProvider 统一管理
  // 运行状态
  const [isRunning, setIsRunning] = useState(false);
  // 取消中状态
  const [isCancelling, setIsCancelling] = useState(false);
  // WebSocket连接引用
  const wsRef = useRef<WebSocket | null>(null);

  // 新建会话
  const handleNewChat = () => {
    router.push(`/`);
  };

  // 选择会话
  const handleSelectChat = async (thread_id: string) => {
    router.push(`/c/${thread_id}`);
  };

  const updateMessages = React.useCallback((data: FetchDataProps) => {
    setMessages(prev => {
      const newMessages = [...prev];

      const role = data.role || 'assistant';
      if (role === 'user') {
        const userMessage = {
          role: role,
          content: data.content,
          source: "",
          agentId: "",
          providerUrl: "",
          contentType: data.content_type
        };
        newMessages.push(userMessage);
        return newMessages;
      }

      if (data.event === 'TEXT_MESSAGE_CHUNK') {
        if (data.source === 'agent') {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && 
              lastMessage.role === 'assistant' && 
              lastMessage.source === 'agent' && 
              lastMessage.agentId === data.agent_id &&
              lastMessage.contentType === 'text') {
            const updatedMessage = {
              ...lastMessage,
              content: (lastMessage?.content || '') + (data?.content || '')
            };
            newMessages[newMessages.length - 1] = updatedMessage;
          } else {
            const agentMessage = {
              role: role,
              content: data.content,
              source: data.source,
              agentId: data.agent_id,
              providerUrl: data.provider_url,
              contentType: data.content_type
            };
            newMessages.push(agentMessage);
          }
        } else {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && 
              lastMessage.role === 'assistant' && 
              lastMessage.source === 'platform') {
            const updatedMessage = {
              ...lastMessage,
              content: (lastMessage?.content || '') + (data?.content || '')
            };
            newMessages[newMessages.length - 1] = updatedMessage;
          } else {
            const agentMessage = {
              role: role,
              content: data.content,
              source: data.source,
              agentId: data.agent_id,
              providerUrl: data.provider_url,
              contentType: data.content_type
            };
            newMessages.push(agentMessage);
          }
        }
      } else if (data.event === 'FILE_ID_STRING') {
        const agentMessage = {
          role: role,
          fileId: data.content,
          source: data.source,
          agentId: data.agent_id,
          providerUrl: data.provider_url,
          contentType: data.content_type
        };
        newMessages.push(agentMessage);
      }

      return newMessages;
    });
  }, []);

  // 发送消息
  // const handleSend = async(msg: string, fileIds: string[], agentName?: string, agentOrganization?: string) => {
  const handleSend = async(msg: string, fileIds: string[], agentName?: string, agentOrganization?: string): Promise<void> => {
    // 正在加载时，不执行任何操作
    if (authLoading) {
      return;
    }
    
    // 未登录则弹窗并中止发送
    if (!userId) {
      // openLogin();
      openLogin(undefined, () => {
        // 调用ChatArea的登录取消处理函数
        chatAreaLoginCancelRef.current?.handleLoginCancel();
      });
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: msg, contentType: 'text' }]);

    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || (process.env.NODE_ENV === 'production' ? 'yugong.org' : '127.0.0.1:5001');
    const ws = new window.WebSocket(`${wsScheme}://${wsHost}/agent-space/agent_space_chat_stream`);
    wsRef.current = ws;
    const req_uuid: string = uuidv4();

    const file_id: string = '';

    ws.onopen = () => {
      ws.send(JSON.stringify({
        thread_id: threadId, // 使用当前线程ID
        request_id: req_uuid,
        user_id: userId,
        text_input: msg,
        file_id_list: fileIds,
        agent_name: agentName,
        agent_org: agentOrganization
      }));
    };

    ws.onmessage = (event) => {
      let data: FetchDataProps;
      try {
        data = JSON.parse(event.data);

        if (data.event !== 'TEXT_MESSAGE_CHUNK'
          && data.event !== 'FILE_ID_STRING'
          && data.event !== 'RUN_FINISHED'
          && data.event !== 'RUN_ERROR'
          && data.event !== 'RUN_STARTED'
          && data.event !== 'RUN_CANCEL'
          && data.event !== 'CHAT_LIST_UPDATED'
        ) {
          return;
        }

        if (data.event === 'RUN_CANCEL') {
          console.log('收到运行取消事件:', data.event);
          setIsRunning(false);
          setIsCancelling(false);
          wsRef.current = null;
          return;
        }

        // 检查结束事件
        if (data.event === 'RUN_FINISHED' || data.event === 'RUN_ERROR') {
          console.log('收到结束事件:', data.event);
          setIsRunning(false);
          wsRef.current = null;
          return;
        }

        if (data.event === 'CHAT_LIST_UPDATED') {
          console.log('收到聊天列表更新事件:', data.event);
          // 更新聊天列表
          updateChats();
          
          // 检查当前页面地址是否为正确的格式
          const currentPath = window.location.pathname;
          const expectedPath = `/c/${threadId}`;
          
          if (currentPath !== expectedPath) {
            // 使用replaceState更新URL，不触发页面跳转
            window.history.replaceState(null, '', expectedPath);
          }
          
          return;
        }

        if (data.event === 'RUN_STARTED') {
          console.log('收到运行开始事件:', data.event);
          setIsRunning(true);
        }

        updateMessages(data);
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setIsRunning(false);
      wsRef.current = null;
      setMessages(prev => [...prev, { role: 'assistant', content: '<span style="color: red;">' + t('fail_retry') + '</span><br>' }]);
    };

    ws.onclose = (event) => {
      console.log('WebSocket 连接关闭:', event.code, event.reason);
      setIsRunning(false);
      wsRef.current = null;
      setMessages(prev => {
        const newPrev = [...prev];
        const lastIdx = newPrev.length - 1;
        if (newPrev[lastIdx]?.role === 'assistant' && file_id) {
          newPrev[lastIdx] = { ...newPrev[lastIdx], fileId: file_id };
        }
        return newPrev;
      });
    };
  };

  // 取消运行 - 改进版本
  const handleCancelRun = () => {
    console.log('handleCancelRun 被调用');
    console.log('wsRef.current:', wsRef.current);
    console.log('wsRef.current?.readyState:', wsRef.current?.readyState);
    console.log('WebSocket.OPEN:', WebSocket.OPEN);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('发送停止信号...');
      try {
        const stopMessage = JSON.stringify({ action: "stop" });
        console.log('准备发送的消息:', stopMessage);
        wsRef.current.send(stopMessage);
        console.log('停止信号已发送，等待后端确认...');
        // 设置取消中状态
        setIsCancelling(true);
        // 不立即关闭连接，等待后端返回 RUN_CANCEL 事件
        // 后端会在 onmessage 中处理 RUN_CANCEL 事件并关闭连接
      } catch (error) {
        console.error('发送停止信号时出错:', error);
        wsRef.current = null;
        setIsRunning(false);
        setIsCancelling(false);
      }
    } else {
      console.log('WebSocket 连接不可用，直接重置状态');
      wsRef.current = null;
      setIsRunning(false);
      setIsCancelling(false);
    }
  };

  // 加载特定会话的消息
  const loadThreadMessages = React.useCallback(async (targetThreadId?: string) => {
    const threadIdToLoad = targetThreadId || threadId;
    if (!threadIdToLoad) return;

    setMessages([]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/agent-space-chat/get-message-list?thread_id=${threadIdToLoad}`);
      const data = await res.json();
      if (!data.ok) {
        console.error('loadThreadMessages data.ok:', data.ok);
        return;
      }

      for (const message of data.data) {
        updateMessages(message);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, updateMessages]);

  // 鼠标高亮效果（保留原代码）
  const highlightRef = useRef<HTMLDivElement>(null);
  
  // 使用useRef来跟踪上一次加载的threadId，避免重复请求
  const lastLoadedThreadIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    updateChats();

    const move = (e: MouseEvent) => {
      if (highlightRef.current) {
        highlightRef.current.style.left = `${e.clientX - 150}px`;
        highlightRef.current.style.top = `${e.clientY - 150 + window.scrollY}px`;
      }
    };
    window.addEventListener('mousemove', move);

    return () => {
      window.removeEventListener('mousemove', move);
    };
  }, [updateChats]);

  // 当threadId变化时加载消息，但避免重复加载相同的threadId
  useEffect(() => {
    if (threadId && threadId !== lastLoadedThreadIdRef.current) {
      console.log('加载消息，threadId:', threadId);
      lastLoadedThreadIdRef.current = threadId;
      loadThreadMessages(threadId);
    }
  }, [threadId, loadThreadMessages]);

  // 处理登录取消的回调
  const handleLoginCancel = () => {
    // 登录取消时，ChatArea会自动恢复输入框状态
    // 这里可以添加其他需要的逻辑
  };

  // 创建一个ref来存储ChatArea的handleLoginCancel函数
  const chatAreaLoginCancelRef = useRef<{ handleLoginCancel: () => void } | null>(null);

  return (
    <>
      <div className="h-screen bg-[#18181c] text-white text-xs md:text-sm selection:bg-blue-100">
        {/* 导航栏 - 固定定位，脱离文档流 */}
        <Navbar2 currentPage="explore" />
        
        {/* 主要内容区域 - 从导航栏下方开始，占满剩余空间 */}
        <div className="h-screen pt-16 flex overflow-hidden">
          {/* 侧边栏 */}
          <Sidebar
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            currentThreadId={threadId}
          />
          
          {/* 主体内容区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatArea 
              messages={messages} 
              onSend={handleSend} 
              agentName={agentName || undefined} 
              agentOrganization={agentOrganization || undefined}
              isRunning={isRunning}
              isCancelling={isCancelling}
              onCancelRun={handleCancelRun}
              isLoading={isLoading}
              onLoginCancel={handleLoginCancel}
              ref={chatAreaLoginCancelRef}
            />
          </div>
        </div>
      </div>
    </>
  );
} 
'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSearchParams, useRouter } from 'next/navigation';

import Navbar2 from '@/app/components/nav2';
import Sidebar from '@/app/components/Sidebar';
import ChatArea, { Message } from '@/app/components/ChatArea';
import { useSidebar } from '@/app/components/SidebarContext';
import { useAuth } from '@/app/components/AuthContext';

// const mockChats: ChatItem[] = [
//   { id: uuidv4(), title: '和AI助手的对话' },
//   { id: uuidv4(), title: '产品头脑风暴' },
//   { id: uuidv4(), title: '技术问题咨询' },
// ];

interface FetchDataProps {
  role?: 'user' | 'assistant';
  content?: string;
  content_type?: string;
  event?: string;
  source?: string;
  agent_id?: string;
  provider_url?: string
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId, openLogin, isLoading: authLoading } = useAuth();
  const agentName = decodeURIComponent(searchParams.get('agentName') || '');
  const agentOrganization = decodeURIComponent(searchParams.get('agentOrganization') || '');
  
  // 使用Context中的侧边栏状态
  const { updateChats } = useSidebar();
  
  // 当前选中的会话ID
  const [activeThreadId, setActiveThreadId] = useState<string>();
  // 聊天消息
  const [messages, setMessages] = useState<Message[]>([]);
  // 加载状态 - 主页面不需要初始加载状态
  const [isLoading] = useState(false);
  // 登录弹窗由 AuthProvider 统一管理
  // 运行状态
  const [isRunning, setIsRunning] = useState(false);
  // 取消中状态
  const [isCancelling, setIsCancelling] = useState(false);
  // WebSocket连接引用
  const wsRef = useRef<WebSocket | null>(null);

  // 新建会话
  const handleNewChat = () => {
    const newId = uuidv4();
    setActiveThreadId(newId);
    setMessages([]);
  };

  // 选择会话
  const handleSelectChat = async (thread_id: string) => {
    router.push(`/c/${thread_id}`);
  };


  const updateMessages = (data: FetchDataProps) => {
    setMessages(prev => {
      const newMessages = [...prev];

      const role = data.role || 'assistant';
      if (role === 'user') {
        // 创建新的agent消息
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

      // 处理 TEXT_MESSAGE_CHUNK 事件
      if (data.event === 'TEXT_MESSAGE_CHUNK') {
        // 检查当前消息是否来自agent
        if (data.source === 'agent') {
          // 检查上一条消息是否也是来自同一个agent
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && 
              lastMessage.role === 'assistant' && 
              lastMessage.source === 'agent' && 
              lastMessage.agentId === data.agent_id &&
              lastMessage.contentType === 'text') {
            // 合并到同一条消息中
            const updatedMessage = {
              ...lastMessage,
              content: (lastMessage?.content || '') + (data?.content || '')
            };
            newMessages[newMessages.length - 1] = updatedMessage;
          } else {
            // 创建新的agent消息
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
          // 非agent消息，创建普通的assistant消息
          // 检查上一条消息是否也是来自同一个agent
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && 
              lastMessage.role === 'assistant' && 
              lastMessage.source === 'platform') {
            // 合并到同一条消息中
            const updatedMessage = {
              ...lastMessage,
              content: (lastMessage?.content || '') + (data?.content || '')
            };
            newMessages[newMessages.length - 1] = updatedMessage;
          } else {
            // 创建新的agent消息
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
        // 创建新的agent消息
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
  }

  // 发送消息
  const handleSend = async(msg: string, fileIds: string[], agentName?: string, agentOrganization?: string): Promise<void> => {
    // 正在加载时，不执行任何操作
    if (authLoading) {
      return;
    }
    
    // 未登录则弹窗并中止发送
    if (!userId) {
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

    // 设置运行状态
    // setIsRunning(true);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        thread_id: activeThreadId,
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

        // console.log('data', data);
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
          // if (!data.content) {
          //   if (data.event === 'RUN_ERROR') {
          //     data.content = '应答失败，请稍后再试';
          //   } else {
          //     data.content = '应答完成';
          //   }
          // }
          return;
        }

        if (data.event === 'CHAT_LIST_UPDATED') {
          console.log('收到聊天列表更新事件:', data.event);
          updateChats();
          
          // 检查当前页面地址是否为正确的格式
          const currentPath = window.location.pathname;
          
          // 如果当前有activeThreadId，检查URL是否正确
          if (activeThreadId) {
            // const expectedPath = `/agent-space-chat/c/${activeThreadId}`;
            const expectedPath = `/c/${activeThreadId}`;
            
            if (currentPath !== expectedPath) {
              // 使用replaceState更新URL，不触发页面跳转
              window.history.replaceState(null, '', expectedPath);
            }
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
      setMessages(prev => [...prev, { role: 'assistant', content: '<span style="color: red;">应答失败，请稍后再试</span><br>' }]);
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

  // 处理登录取消的回调
  const handleLoginCancel = () => {
    // 登录取消时，ChatArea会自动恢复输入框状态
    // 这里可以添加其他需要的逻辑
  };

  // 创建一个ref来存储ChatArea的handleLoginCancel函数
  const chatAreaLoginCancelRef = useRef<{ handleLoginCancel: () => void } | null>(null);

  // 加载指定会话的消息
  // async function loadThreadMessages(thread_id: string) {
  //   setIsLoading(true); // 开始加载
    
  //   try {
  //     const res = await fetch(`/api/agent-space-chat/get-message-list?thread_id=${thread_id}`);
  //     const data = await res.json();
  //     if (!data.ok) {
  //       console.error('loadThreadMessages data.ok:', data.ok);
  //       return;
  //     }
  //     setMessages(data.data);
  //   } catch (error) {
  //     console.error('加载消息失败:', error);
  //   } finally {
  //     setIsLoading(false); // 加载完成
  //   }
  // }

  // 鼠标高亮效果（保留原有代码）
  const highlightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 加载历史会话列表
    updateChats();

    // 新建一个会话
    const newId = uuidv4();
    setActiveThreadId(newId);

    const move = (e: MouseEvent) => {
      if (highlightRef.current) {
        highlightRef.current.style.left = `${e.clientX - 150}px`;
        highlightRef.current.style.top = `${e.clientY - 150 + window.scrollY}px`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [updateChats]);

  return (
    <>
      {/* <Head>
        <title>{agentName ? `与 ${agentName} 对话` : 'Agent对话'}</title>
      </Head> */}
      <div className="h-screen bg-[#18181c] text-white text-xs md:text-sm selection:bg-blue-100">
        {/* 导航栏 - 固定定位，脱离文档流 */}
        <Navbar2 currentPage="explore" />
        
        {/* 主要内容区域 - 从导航栏下方开始，占满剩余空间 */}
        <div className="h-screen pt-16 flex overflow-hidden">
          {/* 侧边栏 */}
          <Sidebar
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
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
      {/* 登录弹窗由 AuthProvider 提供 */}
    </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#18181c] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3">加载中...</span>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

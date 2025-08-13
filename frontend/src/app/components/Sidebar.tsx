import React from 'react';
import { MessageCirclePlus, PanelLeft } from 'lucide-react';
import { useSidebar } from './SidebarContext';

export interface ChatItem {
  thread_id: string;
  title: string;
}

interface SidebarProps {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  currentThreadId?: string;
}

export default function Sidebar({ onNewChat, onSelectChat, currentThreadId }: SidebarProps) {
  const { collapsed, setCollapsed, chats } = useSidebar();

  return (
    <aside
      className={`bg-[#23232a] text-white border-r border-gray-800 h-full transition-all duration-300 flex flex-col overflow-hidden flex-shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* 顶部区域 - 固定高度 */}
      <div className={`flex-shrink-0 flex ${collapsed ? 'flex-col items-center gap-2' : 'flex-row gap-2'} pt-2 px-2 pb-1 border-b border-gray-800`}>
        <button
          className="text-white hover:bg-[#23233a] hover:text-blue-500 rounded-full p-2 flex items-center justify-center cursor-pointer transition-colors"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <button
          className="text-white hover:bg-[#23233a] hover:text-blue-500 rounded-full p-1 flex items-center justify-center cursor-pointer transition-colors"
          onClick={onNewChat}
          title="新建会话"
        >
          <MessageCirclePlus className="h-5 w-5" />
        </button>
      </div>
      {/* 聊天记录列表 - 可滚动区域 */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto pt-0 px-2 pb-2 min-h-0">
          {chats.map((chat) => (
            <div
              key={chat.thread_id}
              className={`p-2 rounded cursor-pointer text-white text-ellipsis whitespace-nowrap overflow-hidden transition-colors ${
                currentThreadId === chat.thread_id 
                  ? 'bg-blue-500/20' 
                  : 'hover:bg-[#23233a]'
              }`}
              onClick={() => onSelectChat(chat.thread_id)}
              title={chat.title}
            >
              {chat.title}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
} 
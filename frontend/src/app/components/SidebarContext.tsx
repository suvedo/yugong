'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { ChatItem } from './Sidebar';
import { useAuth } from './AuthContext';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  chats: ChatItem[];
  setChats: (chats: ChatItem[]) => void;
  updateChats: () => Promise<void>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const { userId } = useAuth();
  const userid = userId;

  const updateChats = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent-space-chat/get-chat-list?user_id=${userid}`);
      const data = await res.json();
      if (!data.ok) {
        console.error('updateChats data.ok:', data.ok);
        return;
      }

      const chatList = data.data.map((item: ChatItem) => ({
        thread_id: item.thread_id,
        title: item.title
      }));

      setChats(chatList);
    } catch (error) {
      console.error('Failed to update chats:', error);
    }
  }, [userid]);

  const value = useMemo(() => ({
    collapsed,
    setCollapsed,
    chats,
    setChats,
    updateChats
  }), [collapsed, chats, updateChats]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
} 
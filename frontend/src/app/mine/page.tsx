"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import Image from "next/image";
import { MessageCircle } from 'lucide-react';

import Navbar2 from "@/app/components/nav2";
import EnhancedBackground from "@/app/components/EnhancedBackground";
// import FloatingElements from "../components/FloatingElements";
// import ModernInput from "@/app/components/ModernInput";
import { useAuth } from '@/app/components/AuthContext';
import { useLanguage } from '@/app/components/LanguageContext';

interface Provider {
  organization: string;
  url: string;
}

interface Agent {
  // additionalInterfaces: any;
  capabilities: {
    // extensions: any;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
    streaming: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  description: string;
  documentationUrl: string | null;
  iconUrl: string | null;
  name: string;
  // preferredTransport: any;
  protocolVersion: string;
  provider: Provider;
  // security: any;
  // securitySchemes: any;
  skills: Array<{
    description: string;
    examples: string[];
    id: string;
    inputModes: string[];
    name: string;
    outputModes: string[];
    tags: string[];
  }>;
  // supportsAuthenticatedExtendedCard: any;
  url: string;
  version: string;
}

export default function AgentSpacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-agent' | 'my-favorate'>('my-agent');
  const { userId, openLogin, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  // 获取agent列表（按当前用户）
  const fetchAgents = async (currentUserId: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL('/api/agent-space/show-agents', window.location.origin);
      url.searchParams.set('user_id', String(currentUserId));
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.text || t('fetch_agents_error'));
      }
      
      const data = await response.json();
      setAgents(Array.isArray(data) ? data : [data]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fetch_agents_error'));
    } finally {
      setLoading(false);
    }
  };

  // 读取URL参数设置activeTab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'my-favorate') {
      setActiveTab('my-favorate');
    }
  }, [searchParams]);

  // 页面加载或登录状态变化时获取数据。
  // 未登录访问该页面时：先弹出登录框，登录成功后自动加载；取消则停留当前页且不请求。
  useEffect(() => {
    if (authLoading) return; // 等待鉴权状态加载
    if (!userId) {
      // 未登录，触发登录弹窗；登录成功后 useEffect 依赖 userId 变更会再次触发并加载数据
      // 取消则不做任何跳转与请求
      openLogin();
      return;
    }
    fetchAgents(userId);
  }, [authLoading, userId, openLogin]);

  // 跳转到对话页面
  const handleStartChat = (agent: Agent) => {
    const params = new URLSearchParams({
      agentName: encodeURIComponent(agent.name),
      ...(agent.provider?.organization && { agentOrganization: encodeURIComponent(agent.provider.organization) })
    });
    // 
    // router.push(`/agent-space-chat?${params.toString()}`);
    router.push(`/?${params.toString()}`);
  };

  return (
    <Suspense fallback={null}>
      <div className="relative min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#202235] to-[#252841] text-white text-sm overflow-x-hidden flex flex-col">
      {/* 增强版背景 */}
      <EnhancedBackground />
      
      {/* 浮动元素 */}
      {/* <FloatingElements /> */}

      <Navbar2 currentPage="mine" />
      
      <main className="flex-1 relative z-10 pt-24 flex flex-col items-center min-h-screen">
        {/* 文字内容 */}
        <div className="text-center mb-12 relative mt-12">
          {/* 主标题光效背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent blur-xl"></div>
          
          {/* 用户基本信息 */}
          <div className="relative z-10 flex justify-start">
            {userId && (
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gray-600 border border-gray-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-l">
                      {userId.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    {/* <div className="text-gray-300 text-sm mb-1">用户邮箱</div> */}
                    <div className="text-white text-base">{userId}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-20 mt-8 min-h-[500px]">
          {/* Tab导航 - 左对齐 */}
          <div className="flex justify-start mb-8">
            <div className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab('my-agent')}
                className={`text-base font-medium transition-all duration-300 cursor-pointer relative pb-2 ${
                  activeTab === 'my-agent'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t('nav_my_agents')}
                {activeTab === 'my-agent' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('my-favorate')}
                className={`text-base font-medium transition-all duration-300 cursor-pointer relative pb-2 ${
                  activeTab === 'my-favorate'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t('nav_favorites')}
                {activeTab === 'my-favorate' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab内容区域 */}
          {activeTab === 'my-agent' && (
            <div className="min-h-[400px] transition-all duration-300">
              {/* 近期收录标题 */}
              {/* <div className="text-center mb-8">
                <h2 className="mixed-font text-2xl font-bold text-white mb-2">近期收录</h2>
                <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto"></div>
              </div> */}

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">{t('loading')}</span>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-4">{error}</div>
                  <button 
                    onClick={() => fetchAgents(userId)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              
              {!loading && !error && agents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents.map((agent, index) => (
                    <div
                      key={index}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 relative max-h-136 min-h-96 overflow-y-auto
                          [&::-webkit-scrollbar]:w-2 
                          [&::-webkit-scrollbar-track]:bg-gray-800 
                          [&::-webkit-scrollbar-thumb]:bg-white/20 
                          [&::-webkit-scrollbar-thumb]:rounded-full"
                    >
                      {/* 开启对话图标 */}
                      <button
                        onClick={() => handleStartChat(agent)}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110"
                        title={t('discover_start_chat')}
                      >
                        <MessageCircle className="w-5 h-5 text-purple-400 hover:text-purple-300" />
                      </button>
                      
                      {/* Agent基本信息 */}
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-white mb-2 pr-10 flex items-center">
                          <Image
                            src={agent.iconUrl || "/icons/default.svg"}
                            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = "/icons/default.svg"; }}
                            alt="icon"
                            className="w-7 h-7 mr-2 rounded object-cover bg-white/10"
                            style={{ minWidth: 28, minHeight: 28 }}
                            width={28}
                            height={28}
                          />
                          {agent.name}
                          {agent.provider?.organization && (
                            <span className="ml-3 text-sm text-gray-300 font-normal">
                              {agent.provider.organization}
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">{agent.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>agent version: {agent.version}</span>
                          <span>•</span>
                          <span>A2A version: {agent.protocolVersion}</span>
                        </div>
                      </div>
                      
                      {/* 能力信息 */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-400 mb-2">capabilities:</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.capabilities.streaming && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">streaming</span>
                          )}
                          {agent.capabilities.pushNotifications && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">push notifications</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 输入输出模式 */}
                      {/* <div className="mb-4">
                        <div className="text-xs text-gray-400 mb-1">输入模式:</div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {agent.defaultInputModes.map((mode, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                              {mode}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-400 mb-1">输出模式:</div>
                        <div className="flex flex-wrap gap-1">
                          {agent.defaultOutputModes.map((mode, i) => (
                            <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div> */}
                      
                      {/* 技能信息 */}
                      {agent.skills && agent.skills.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-400 mb-2">skills:</div>
                          {agent.skills.map((skill, i) => (
                            <div key={i} className="mb-2 p-2 bg-gray-800/50 rounded">
                              <div className="text-sm font-medium text-white mb-1">{skill.name}</div>
                              <div className="text-xs text-gray-300 mb-1">{skill.description}</div>
                              {/* 输入输出模式 */}
                              <div className="mb-4">
                                <div className="text-xs text-gray-400 mb-1">input modes:</div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {(skill.inputModes && skill.inputModes.length > 0 ? skill.inputModes : agent.defaultInputModes).map((mode: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                      {mode}
                                    </span>
                                  ))}
                                </div>
                                <div className="text-xs text-gray-400 mb-1">output modes:</div>
                                <div className="flex flex-wrap gap-1">
                                  {(skill.outputModes && skill.outputModes.length > 0 ? skill.outputModes : agent.defaultOutputModes).map((mode: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                                      {mode}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {skill.tags && skill.tags.length > 0 && (
                                // <div className="flex flex-wrap gap-1 mb-4">
                                <div className="mb-4">
                                  <div className="text-xs text-gray-400 mb-1">tags:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {skill.tags.map((tag, j) => (
                                      <span key={j} className="px-1 py-0.5 bg-gray-600/50 text-gray-300 text-xs rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {skill.examples && skill.examples.length > 0 && (
                                <div className="mb-4">
                                  <div className="text-xs text-gray-400 mb-1">examples:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {skill.examples.map((example, j) => (
                                      <span key={j} className="px-1 py-0.5 bg-gray-600/50 text-gray-300 text-xs rounded">
                                        {example}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!loading && !error && agents.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400">{t('discover_no_agent')}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-favorate' && (
            <div className="min-h-[400px] transition-all duration-300">
              
            </div>
          )}
        </div>
      </main>
    </div>
    </Suspense>
  );
}

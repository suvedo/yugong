"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { MessageCircle } from 'lucide-react';

import Navbar2 from "../components/nav2";
import EnhancedBackground from "../components/EnhancedBackground";
// import FloatingElements from "../components/FloatingElements";
import ModernInput from "../components/ModernInput";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchResults, setSearchResults] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'search'>('recent');
  const { userId, openLogin, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  // 获取agent列表
  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/agent-space/show-agents');
      
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

  // 页面加载时获取数据
  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSearch = async (term: string) => {
    if (authLoading) {
      return; // 正在加载时，不执行任何操作
    }
    
    if (!userId) {
      openLogin();
      return;
    }

    if (!term.trim()) {
      // 清空搜索，切换回近期收录tab
      setHasSearched(false);
      setSearchResults([]);
      setSearchError(null);
      setActiveTab('recent');
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError(null);
      setHasSearched(true);
      setActiveTab('search'); // 自动切换到搜索结果tab

      const response = await fetch('/api/agent-space/search-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            request_id: uuidv4(),
            user_id: userId,
            text_input: term.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.text || t('search_agents_error'));
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : [data]);

    } catch (err) {
      setSearchError(err instanceof Error ? err.message : t('search_agents_error'));
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

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
    <div className="relative min-h-screen bg-gradient-to-br from-[#1a1d29] via-[#202235] to-[#252841] text-white text-sm overflow-x-hidden flex flex-col">
      {/* 增强版背景 */}
      <EnhancedBackground />
      
      {/* 浮动元素 */}
      {/* <FloatingElements /> */}

      <Navbar2 currentPage="discover" />
      
      <main className="flex-1 relative z-10 pt-24 flex flex-col items-center min-h-screen">
        {/* 文字内容 */}
        <div className="text-center mb-12 relative mt-12">
          {/* 主标题光效背景 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent blur-xl"></div>
          
          <div className="relative z-10">
            {/* <h1 className="mixed-font text-3xl sm:text-4xl mb-6 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              发现AI智能体服务
            </h1> */}
            
            <div className="mixed-font text-lg font-semibold mb-0 text-gray-300 relative">
              <span className="relative z-10">{t('discover_title')}</span>
            </div>
          </div>
        </div>

        {/* 搜索框区域 */}
        <div className="w-full max-w-8xl mx-auto px-4 mb-8">
          <ModernInput
            placeholder={t('discover_placeholder')}
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={handleSearch}
            loading={false}
            multiline={true}
          />
          
          {/* 搜索结果/提示区域 */}
          {/* <div className="mt-4 p-3 text-center text-sm font-medium h-6">
            <div className="text-gray-500 text-xs">
              按 Ctrl+Enter (Windows) 或 Cmd+Enter (Mac) 发送搜索
            </div>
          </div> */}
        </div>

        {/* Agent列表展示区域 */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-20 mt-8 min-h-[500px]">
          {/* Tab导航 */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('recent')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                  activeTab === 'recent'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('discover_recent')}
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('discover_search_results')}
                {hasSearched && searchResults.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {searchResults.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab内容区域 */}
          {activeTab === 'recent' && (
            <div className="min-h-[400px] transition-all duration-300">
              {/* 近期收录标题 */}
              {/* <div className="text-center mb-8">
                <h2 className="mixed-font text-2xl font-bold text-white mb-2">近期收录</h2>
                <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto"></div>
              </div> */}

              {/* 近期收录加载状态 */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">{t('loading')}</span>
                </div>
              )}
              
              {/* 近期收录错误状态 */}
              {error && (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-4">{error}</div>
                  <button 
                    onClick={fetchAgents}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              
              {/* 近期收录列表 */}
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
                            width={28}
                            height={28}
                            style={{ minWidth: 28, minHeight: 28 }}
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
              
              {/* 近期收录无数据 */}
              {!loading && !error && agents.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400">{t('discover_no_agent')}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="min-h-[400px] transition-all duration-300">
              {/* 搜索结果标题 */}
              <div className="text-center mb-8">
                {/* <h2 className="mixed-font text-2xl font-bold text-white mb-2">搜索结果</h2> */}
                {/* <div className="w-16 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto"></div> */}
                {hasSearched && searchTerm && (
                  <div className="mt-3 text-sm text-gray-400">
                    {t('discover_task_description')}: &ldquo;{searchTerm}&rdquo;
                  </div>
                )}
              </div>

              {/* 搜索加载状态 */}
              {searchLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-gray-300">{t('discover_searching')}</span>
                </div>
              )}
              
              {/* 搜索错误状态 */}
              {searchError && (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-4">{searchError}</div>
                  <button 
                    onClick={() => handleSearch(searchTerm)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              
              {/* 搜索结果列表 */}
              {!searchLoading && !searchError && searchResults.length > 0 && (
                <div className={
                  searchResults.length === 1 
                    ? "flex justify-center"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                }>
                  {searchResults.map((agent, index) => (
                    // <div key={index} className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 relative ${
                    //   searchResults.length === 1 ? "max-w-md" : ""
                    // }`}>
                      <div
                      key={index}
                      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 relative max-h-136 min-h-96 overflow-y-auto
                          [&::-webkit-scrollbar]:w-2 
                          [&::-webkit-scrollbar-track]:bg-gray-800 
                          [&::-webkit-scrollbar-thumb]:bg-white/20 
                          [&::-webkit-scrollbar-thumb]:rounded-full
                          ${searchResults.length === 1 ? "max-w-md w-full" : ""}`}
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
                            width={28}
                            height={28}
                            style={{ minWidth: 28, minHeight: 28 }}
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
              
              {/* 搜索无结果 */}
              {!searchLoading && !searchError && hasSearched && searchResults.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">{t('discover_no_result')}</div>
                  <div className="text-sm text-gray-500">{t('discover_try_adjust')}</div>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setHasSearched(false);
                      setSearchResults([]);
                      setActiveTab('recent');
                    }}
                    className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {t('discover_recent_browse')}
                  </button>
                </div>
              )}

              {/* 未进行搜索时的提示 */}
              {!hasSearched && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">{t('discover_please_search')}</div>
                  {/* <div className="text-sm text-gray-500">描述你的需求，我们会为你找到合适的AI智能体</div> */}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

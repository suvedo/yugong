'use client';

import React from 'react';

type SupportedLanguage = 'en' | 'zh';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const defaultLanguage: SupportedLanguage = 'en';

const translations: Record<string, { en: string; zh: string }> = {
  // navbar
  nav_explore: { en: 'Explore', zh: '探索' },
  nav_share: { en: 'Share', zh: '分享' },
  nav_discover: { en: 'Discover', zh: '发现' },
  nav_mine: { en: 'Mine', zh: '我的' },
  nav_login: { en: 'Login', zh: '登录' },
  nav_logout: { en: 'Logout', zh: '退出登录' },
  nav_my_agents: { en: 'My agents', zh: '我的agent' },
  nav_favorites: { en: 'My favorites', zh: '我的收藏' },
  nav_brand: { en: 'Yugong Community', zh: '愚公社区' },
  // page.tsx
  loading: { en: 'Loading...', zh: '加载中...' },
  retry: { en: 'Retry', zh: '重试' },
  fail_retry: { en: 'Response failed, please retry later', zh: '应答失败，请稍后再试' },
  // ChatArea.tsx
  chat_loading: { en: 'Loading...', zh: '加载中...' },
  chat_welcome: { en: "Hi, I'm Yugong. Start your intelligent exploration here", zh: 'hi，我是愚公，在此开启你的智能探索' },
  chat_placeholder: { en: 'Be a little “foolish”, life gets better', zh: '自“愚”一下，生活更美好' },
  chat_single_agent_tip: { en: 'Only one agent can be specified', zh: '目前支持最多指定一个agent' },
  chat_task_running: { en: 'A task is running', zh: '当前存在运行的任务' },
  chat_uploading_wait: { en: 'Uploading files, please try later', zh: '文件上传中，请稍后再试' },
  chat_upload_title_disabled: { en: 'Up to 5 files are supported', zh: '目前最多支持5个文件' },
  chat_upload_title: { en: 'Click to upload images/files', zh: '点击上传图片与文件' },
  chat_cancelled_title: { en: 'Cancelled, please wait', zh: '已取消，请稍候' },
  chat_running_title: { en: 'Running, click to cancel', zh: '正在运行，点击取消' },
  chat_send_title: { en: 'Send message', zh: '发送消息' },
  chat_recommending: { en: 'Recommending...', zh: '推荐中...' },
  chat_no_match_prefix: { en: 'No Agent matches', zh: '未找到匹配' },
  chat_no_match_prefix_at: { en: '', zh: '的agent' },
  chat_input_at_to_search: { en: 'Type @ to search Agent', zh: '输入@开始搜索Agent' },
  chat_detecting_file_type: { en: 'Detecting file type...', zh: '检测文件类型中...' },
  chat_image_alt: { en: 'Image', zh: '图片' },
  chat_file_label: { en: 'FILE', zh: '文件' },
  chat_click_to_download: { en: 'Click to download', zh: '点击下载' },
  // agent-space-share/page.tsx
  share_title: { en: 'Share your agent service here', zh: '在此分享你的agent服务' },
  share_placeholder: { en: 'Enter the URL of your A2A service to register', zh: '输入A2A服务的URL以注册' },
  share_success: { en: 'Registration successful, please check in \'My agents\'', zh: '注册成功，请在‘我的agent’中查看' },
  share_error: { en: 'Registration failed', zh: '注册失败' },
  // components/FloatingElements.tsx
  floating_title1: { en: 'The world cannot continue to change without a little madness', zh: '世界无法继续改变，除非加入一点点疯狂' },
  floating_title2: { en: 'In this era, the greatest risk is not taking one', zh: '在这个时代，最大的冒险就是不冒险' },
  floating_title3: { en: 'Insanity is doing the same thing over and over and expecting different results', zh: '什么是疯子？\n就是重复做同样的事情，还期待有不同的结果' },
  floating_title4: { en: 'The future is already here, it\'s just not evenly distributed', zh: '未来已经在这里，只是没有平均分布' },
  floating_title5: { en: 'Fortune favors the bold', zh: '勇敢的人先享受世界' },
  floating_title6: { en: 'The best way to predict the future is to create it', zh: '预测未来最好的办法就是把它创造出来' },
  // agent-space-discover/page.tsx
  fetch_agents_error: { en: 'Failed to fetch agent list', zh: '获取agent列表失败' },
  fetch_agents_success: { en: 'Fetch agent list successfully', zh: '获取agent列表成功' },
  search_agents_error: { en: 'Search failed', zh: '搜索失败' },
  discover_title: { en: 'Discover interesting agent services here', zh: '在此发现有趣的agent服务' },
  discover_placeholder: { en: 'Enter your task, get the most matching agent service (Shift+Enter to newline)', zh: '输入你的任务，获取最匹配的agent服务（Shift+Enter换行）' },
  discover_recent: { en: 'Recent', zh: '近期收录' },
  discover_search_results: { en: 'Results', zh: '搜索结果' },
  discover_start_chat: { en: 'chat', zh: '开启对话' },
  discover_no_agent: { en: 'No agent services', zh: '暂无AI智能体服务' },
  discover_task_description: { en: 'Task description', zh: '任务描述' },
  discover_searching: { en: 'Searching...', zh: '搜索中...' },
  discover_no_result: { en: 'No result', zh: '未找到相关AI智能体服务' },
  discover_try_adjust: { en: 'Try adjusting the search task description or browsing the recently collected services', zh: '尝试调整搜索任务描述或浏览近期收录的服务' },
  discover_please_search: { en: 'Please search by describing your task in the search box', zh: '请在搜索框中描述你的任务开始搜索' },
  discover_recent_browse: { en: 'Browse recent', zh: '浏览近期收录' },
  // AuthContext.tsx
  auth_verify_failed: { en: 'Verification failed, please try again', zh: '验证失败，请稍后再试' },
  network_error: { en: 'Network error, please try again later', zh: '网络错误，请稍后再试' },
  // LoginModal.tsx
  login_email_title: { en: 'Email login', zh: '邮箱登录' },
  login_email: { en: 'Email', zh: '邮箱' },
  login_email_placeholder: { en: 'Please enter your email', zh: '请输入你的邮箱' },
  login_code: { en: 'Code', zh: '验证码' },
  login_code_placeholder: { en: 'Please enter your code', zh: '请输入你的验证码' },
  login_send_code: { en: 'Send code', zh: '发送验证码' },
  login_login: { en: 'Login', zh: '登录' },
  login_send_code_again: { en: 'Send code again', zh: '重新发送' },
  login_sending: { en: 'Sending...', zh: '发送中...' },
  login_cancel: { en: 'Cancel', zh: '取消' },
  // Sidebar.tsx
  sidebar_new_chat: { en: 'New chat', zh: '新建会话' },
  sidebar_expand_sidebar: { en: 'Expand sidebar', zh: '展开侧边栏' },
  sidebar_collapse_sidebar: { en: 'Collapse sidebar', zh: '收起侧边栏' },
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<SupportedLanguage>(defaultLanguage);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem('yg_lang');
      if (saved === 'en' || saved === 'zh') {
        setLanguageState(saved);
      }
    } catch {}
  }, []);

  const setLanguage = React.useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem('yg_lang', lang);
    } catch {}
  }, []);

  const toggleLanguage = React.useCallback(() => {
    setLanguageState((prev: SupportedLanguage) => {
      const next: SupportedLanguage = prev === 'en' ? 'zh' : 'en';
      try {
        window.localStorage.setItem('yg_lang', next);
      } catch {}
      return next;
    });
  }, []);

  const t = React.useCallback(
    (key: string) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[language] ?? key;
    },
    [language]
  );

  const value = React.useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}



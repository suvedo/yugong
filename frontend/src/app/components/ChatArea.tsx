import React, { JSX } from 'react';
import { ArrowUp, Plus, Loader2, X, StopCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { useAuth } from '@/app/components/AuthContext';

export interface Message {
  role: 'user' | 'assistant';
  source?: string;
  agentId?: string;
  providerUrl?: string;
  contentType?: string;
  content?: string;
  fileId?: string;
}

interface ChatAreaProps {
  messages: Message[];
  onSend: (msg: string, fileIds: string[], agentName?: string, agentOrganization?: string) => Promise<void>;
  agentName?: string;
  agentOrganization?: string;
  isRunning?: boolean;
  isCancelling?: boolean;
  onCancelRun?: () => void;
  isLoading?: boolean;
  onLoginCancel?: () => void;
}

const ChatArea = React.forwardRef<{ handleLoginCancel: () => void }, ChatAreaProps>(({ messages, onSend, agentName: initialAgentName, agentOrganization: initialAgentOrganization, isRunning = false, isCancelling = false, onCancelRun, isLoading = false, onLoginCancel }, ref) => {
  const [input, setInput] = React.useState('');
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [fileNames, setFileNames] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  // 内部管理agent状态
  const [currentAgentName, setCurrentAgentName] = React.useState<string | undefined>(initialAgentName);
  const [currentAgentOrganization, setCurrentAgentOrganization] = React.useState<string | undefined>(initialAgentOrganization);
  
  // @mention搜索相关状态
  const [isSearchingAgents, setIsSearchingAgents] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const [searchPrefix, setSearchPrefix] = React.useState('');
  const [cursorPosition, setCursorPosition] = React.useState({ x: 0, y: 0 });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // 输入法组合状态
  const [isComposing, setIsComposing] = React.useState(false);
  
  // @mention位置信息
  const [mentionPosition, setMentionPosition] = React.useState<number>(-1);
  // 新增：@mention唯一性提示
  const [showSingleMentionTip, setShowSingleMentionTip] = React.useState(false);
  const [tipPosition, setTipPosition] = React.useState({ x: 0, y: 0 });
  const [tipMessage, setTipMessage] = React.useState('');
  
  // 输入框悬停状态
  const [isInputHovered, setIsInputHovered] = React.useState(false);
  
  // 保存登录前的输入内容
  const [savedInput, setSavedInput] = React.useState('');
  const [savedFileIds, setSavedFileIds] = React.useState<string[]>([]);
  const [savedFileNames, setSavedFileNames] = React.useState<string[]>([]);
  const [savedAgentName, setSavedAgentName] = React.useState<string | undefined>(undefined);
  const [savedAgentOrganization, setSavedAgentOrganization] = React.useState<string | undefined>(undefined);
  const [savedMentionPosition, setSavedMentionPosition] = React.useState<number>(-1);

  const { userId, openLogin, isLoading: authLoading } = useAuth();

  // 使用ref来存储函数，避免useEffect依赖问题
  const restoreSavedStateRef = React.useRef<(() => void) | null>(null);

  // 监听userId变化，如果从null变为有值，说明登录成功，恢复状态
  React.useEffect(() => {
    if (userId && savedInput) {
      // 登录成功，恢复保存的状态
      restoreSavedStateRef.current?.();
    }
  }, [userId, savedInput]);

  // 处理登录取消的情况
  const handleLoginCancel = () => {
    // 用户取消登录，恢复保存的状态
    if (savedInput) {
      restoreSavedStateRef.current?.();
    }
    // 调用父组件的取消回调
    onLoginCancel?.();
  };

  // 暴露handleLoginCancel函数给父组件
  React.useImperativeHandle(ref, () => ({
    handleLoginCancel
  }));

  // 当props变化时，更新内部状态
  React.useEffect(() => {
    setCurrentAgentName(initialAgentName);
    setCurrentAgentOrganization(initialAgentOrganization);
  }, [initialAgentName, initialAgentOrganization]);

  // 获取agent的显示名称
  const getAgentDisplayName = () => {
    if (!currentAgentName) return '';
    if (currentAgentOrganization) {
      return `${currentAgentName}|${currentAgentOrganization}`;
    }
    return currentAgentName;
  };

  // 获取完整的显示文本（包括@mention前缀）
  const getDisplayValue = () => {
    const agentDisplay = getAgentDisplayName();
    if (agentDisplay) {
      const mentionText = `@${agentDisplay} `;
      if (mentionPosition >= 0 && mentionPosition <= input.length) {
        // 在指定位置插入@mention
        const before = input.substring(0, mentionPosition);
        const after = input.substring(mentionPosition);
        return before + mentionText + after;
      } else {
        // 如果没有有效位置信息，默认在开头
        return mentionText + input;
      }
    }
    return input;
  };

  // 处理输入变化
  const handleInputChange = (value: string) => {
    const agentDisplay = getAgentDisplayName();
    
    // 如果当前有agent，处理已有@mention的情况
    if (agentDisplay) {
      const mentionText = `@${agentDisplay} `;
      
      if (value.includes(mentionText)) {
        // 用户输入包含@mention，提取实际的用户输入部分
        const parts = value.split(mentionText);
        const beforeMention = parts[0];
        const afterMention = parts[1] || '';
        setInput(beforeMention + afterMention);
        // 更新@mention位置
        setMentionPosition(beforeMention.length);
        setShowSearchResults(false);
      } else {
        // 用户删除了@mention标签，清空agent
        clearAgent();
        // 检查新输入是否包含@符号来触发新搜索
        const lastAtIndex = value.lastIndexOf('@');
        if (lastAtIndex !== -1) {
          const afterAt = value.substring(lastAtIndex + 1);
          if (!afterAt.includes(' ') && afterAt.length <= 10 && !isComposing) {
            setSearchPrefix(afterAt);
            setShowSearchResults(true);
            searchAgentsByPrefix(afterAt);
          }
        } else {
          setShowSearchResults(false);
        }
        setInput(value);
      }
    } else {
      // 没有agent的情况，检查文本中任意位置的@符号
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        // 找到最后一个@符号，提取其后的内容作为搜索前缀
        const afterAt = value.substring(lastAtIndex + 1);
        
        // 检查@符号后是否有空格，如果有空格说明不是在输入@mention
        if (afterAt.includes(' ')) {
          // @符号后有空格，不触发搜索
          setShowSearchResults(false);
        } else if(afterAt.length <= 10 && !isComposing) {
          // @符号后没有空格，可能在输入@mention
          setSearchPrefix(afterAt);
          setShowSearchResults(true);
          searchAgentsByPrefix(afterAt);
        }
        setInput(value);
      } else {
        setInput(value);
        setShowSearchResults(false);
      }
    }
    // 新增：已有@mention时再次输入@，弹出提示
    if (agentDisplay) {
      // 检查本次输入是否有新@符号
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1 && !value.includes(`@${agentDisplay}`)) {
        // 只要不是原有的@mention，且有@，就弹提示
        getCursorPosition();
        setTipMessage('目前支持最多指定一个agent');
        setShowSingleMentionTip(true);
        setTipPosition(cursorPosition);
        setTimeout(() => setShowSingleMentionTip(false), 3000);
      }
    }
  };

  // 处理输入法组合完成后的搜索
  const handleCompositionEnd = () => {
    setIsComposing(false);
    
    // 在输入法组合完成后，检查是否需要触发搜索
    const value = input;
    if (!currentAgentName) {
      const lastAtIndex = value.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const afterAt = value.substring(lastAtIndex + 1);
        // 检查@符号后是否有空格，如果有空格说明不是在输入@mention
        if (!afterAt.includes(' ') && afterAt.length <= 10) {
          setSearchPrefix(afterAt);
          setShowSearchResults(true);
          searchAgentsByPrefix(afterAt);
        }
      }
    }
  };

  const handleSend = async () => {
    if (input.trim() || currentAgentName) {
      // 发送完整的显示文本（包含@mention部分）
      const fullMessage = getDisplayValue().trim();
      if (fullMessage) {
        // 保存当前状态，以便登录成功后恢复
        saveCurrentState();
        
        try {
          // 调用父组件的发送函数，如果未登录会触发登录模态框
          await onSend(fullMessage, fileIds, currentAgentName, currentAgentOrganization);
          
          // 只有在成功发送后才清空输入框
          setInput('');
          setFileIds([]);
          setFileNames([]);
          // 清空agent标签
          clearAgent();
        } catch {
          // 如果发送失败，恢复保存的状态
          restoreSavedState();
        }
      }
    }
  };



  // 保存当前输入状态
  const saveCurrentState = () => {
    setSavedInput(input);
    setSavedFileIds([...fileIds]);
    setSavedFileNames([...fileNames]);
    setSavedAgentName(currentAgentName);
    setSavedAgentOrganization(currentAgentOrganization);
    setSavedMentionPosition(mentionPosition);
  };

  // 恢复保存的输入状态
  const restoreSavedState = React.useCallback(() => {
    setInput(savedInput);
    setFileIds([...savedFileIds]);
    setFileNames([...savedFileNames]);
    setCurrentAgentName(savedAgentName);
    setCurrentAgentOrganization(savedAgentOrganization);
    setMentionPosition(savedMentionPosition);
    
    // 清空保存的状态
    setSavedInput('');
    setSavedFileIds([]);
    setSavedFileNames([]);
    setSavedAgentName(undefined);
    setSavedAgentOrganization(undefined);
    setSavedMentionPosition(-1);
  }, [savedInput, savedFileIds, savedFileNames, savedAgentName, savedAgentOrganization, savedMentionPosition]);

  // 更新ref
  React.useEffect(() => {
    restoreSavedStateRef.current = restoreSavedState;
  }, [restoreSavedState]);

  // 清空agent
  const clearAgent = () => {
    setCurrentAgentName(undefined);
    setCurrentAgentOrganization(undefined);
    setMentionPosition(-1);
  };

  // 搜索agent的函数
  const searchAgentsByPrefix = async (prefix: string) => {
    if (authLoading) {
      return; // 正在加载时，不执行任何操作
    }
    
    if (!userId) {
      openLogin();
      return;
    }

    if (prefix.length > 10) return; // 超过10个字符就不搜索了
    
    // 计算光标位置
    getCursorPosition();
    
    setIsSearchingAgents(true);
    try {
      const requestId = uuidv4();
      const response = await fetch('/api/agent-space-chat/search-agent-by-prefix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          user_id: userId,
          prefix: prefix
        })
      });
      
      const data = await response.json();
      if (response.ok && data) {
        setSearchResults(data);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('搜索agent失败:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearchingAgents(false);
    }
  };

  // 选择搜索结果中的agent
  const selectAgent = (agent: string) => {
    const parts = agent.split("|");
    const name = parts[0];
    setCurrentAgentName(name);

    const org = parts.length > 1 ? parts[1] : undefined;
    setCurrentAgentOrganization(org);
    
    // 保留@符号前的文本内容，并记录@mention位置
    const currentValue = input;
    const lastAtIndex = currentValue.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // 保留@符号前的内容，记录@mention插入位置
      const beforeAt = currentValue.substring(0, lastAtIndex);
      const afterAt = currentValue.substring(lastAtIndex + 1);
      // 移除@符号后的搜索内容，只保留空格后的内容
      const spaceIndex = afterAt.indexOf(' ');
      const restContent = spaceIndex !== -1 ? afterAt.substring(spaceIndex) : '';
      setInput(beforeAt + restContent);
      setMentionPosition(beforeAt.length);
    } else {
      // 如果没有找到@符号，@mention在开头
      setMentionPosition(0);
    }
    
    setShowSearchResults(false);
    setSearchPrefix('');
  };

  // 获取光标位置
  const getCursorPosition = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const paddingLeft = parseInt(style.paddingLeft, 10) || 0;
    const paddingTop = parseInt(style.paddingTop, 10) || 0;
    
    // 创建一个临时的镜像元素来计算光标位置
    const mirror = document.createElement('div');
    
    // 复制textarea的样式
    mirror.style.position = 'absolute';
    mirror.style.left = '-9999px';
    mirror.style.top = '-9999px';
    mirror.style.width = style.width;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.padding = '0';
    mirror.style.border = '0';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.visibility = 'hidden';
    
    document.body.appendChild(mirror);
    
    // 获取光标位置
    const cursorOffset = textarea.selectionStart || 0;
    const textBeforeCursor = textarea.value.substring(0, cursorOffset);
    
    // 查找最后一个@符号的位置
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textBeforeAt = textBeforeCursor.substring(0, lastAtIndex);
      mirror.textContent = textBeforeAt;
      const beforeAtHeight = mirror.offsetHeight;
      
      mirror.textContent = textBeforeAt + '@';
      const afterAtHeight = mirror.offsetHeight;
      
      // 计算@符号的位置
      const lines = textBeforeAt.split('\n');
      const currentLine = lines[lines.length - 1];
      const lineWidth = currentLine.length * 8; // 近似字符宽度
      
      setCursorPosition({
        x: rect.left + paddingLeft + Math.min(lineWidth, rect.width - 200),
        y: rect.top + paddingTop + beforeAtHeight + (afterAtHeight - beforeAtHeight) + 20
      });
    } else {
      // 如果没有@符号，显示在输入框下方
      setCursorPosition({
        x: rect.left + paddingLeft,
        y: rect.bottom + 4
      });
    }
    
    document.body.removeChild(mirror);
  };

  // 处理换行符和制表符的通用函数
  const processText = (text: string) => {
    return text.split('\n').map((line, lineIndex) => (
      <span key={lineIndex}>
        {line.split('\t').map((part, partIndex) => (
          <span key={partIndex}>
            {part}
            {partIndex < line.split('\t').length - 1 && <span style={{ display: 'inline-block', width: '2em' }}></span>}
          </span>
        ))}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  // 渲染带@mention样式的消息内容
  const renderMessageContent = (content: string) => {
    // 查找@mention的位置（可能在任意位置）
    const mentionMatch = content.match(/@([^\s]+)/);
    if (mentionMatch) {
      const fullMatch = mentionMatch[0];
      const mentionIndex = content.indexOf(fullMatch);
      const before = content.substring(0, mentionIndex);
      const after = content.substring(mentionIndex + fullMatch.length);
      
      return (
        <span>
          {before && <span>{processText(before)}</span>}
          <span>{fullMatch}</span>
          {after && <span>{processText(after)}</span>}
        </span>
      );
    }
    return <span>{processText(content)}</span>;
  };

  // 渲染助手消息内容
  const renderAssistantContent = (content: string, agentId?: string, providerUrl?: string, source?: string, fileId?: string) => {
    // 如果是 agent 消息，用单独的框包围
    if (source === 'agent' && agentId) {
      console.log('providerUrl', providerUrl);
      return (
        <div className="bg-[#23232a] h-auto w-full max-w-[1200px] p-2 rounded-lg">
          {/* Agent 消息头部信息 */}
          <div className="mb-2 pb-2">
            <div className="flex items-center gap-2">
              {providerUrl ? (
                <a 
                  href={providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-200 text-sm hover:text-blue-100 cursor-pointer"
                >
                  @{agentId}
                </a>
              ) : (
                <span className="text-blue-200 text-sm">@{agentId}</span>
              )}
            </div>
          </div>
          
          {/* Agent 消息内容 */}
          {processHTMLContent(content)}
          
          {/* 文件展示区 */}
          {fileId && <FilePreviewList fileIds={[fileId]} />}
        </div>
      );
    }
    
    // 其他消息使用原有的文本处理
    return (
      <div>
        {processHTMLContent(content)}
        {/* 文件展示区 */}
        {fileId && <FilePreviewList fileIds={[fileId]} />}
      </div>
    );
  };

  const processHTMLContent = (content: string) => {
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: content }} 
        className="leading-relaxed 
          [&>ul]:list-disc [&>ul]:pl-5 
          [&>ol]:list-decimal [&>ol]:pl-5
          [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-4
          [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-3
          [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-2
          [&>h4]:text-base [&>h4]:font-bold [&>h4]:mb-2 [&>h4]:mt-2
          [&>h5]:text-sm [&>h5]:font-bold [&>h5]:mb-1 [&>h5]:mt-1
          [&>h6]:text-xs [&>h6]:font-bold [&>h6]:mb-1 [&>h6]:mt-1
          [&>p]:mb-2
          [&>blockquote]:border-l-4 [&>blockquote]:border-gray-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600
          [&>code]:bg-gray-700 [&>code]:text-green-400 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm
          [&>pre]:bg-gray-800 [&>pre]:p-3 [&>pre]:rounded [&>pre]:overflow-x-auto [&>pre]:my-2
          [&>pre>code]:bg-transparent [&>pre>code]:text-white [&>pre>code]:p-0
          [&>table]:border-collapse [&>table]:w-full [&>table]:my-4
          [&>table>thead]:bg-gray-700
          [&>table>tbody>tr:nth-child(even)]:bg-gray-600
          [&>table>tbody>tr:nth-child(odd)]:bg-gray-500
          [&>table>th]:border [&>table>th]:border-gray-400 [&>table>th]:px-3 [&>table>th]:py-2 [&>table>th]:text-left
          [&>table>td]:border [&>table>td]:border-gray-400 [&>table>td]:px-3 [&>table>td]:py-2
          [&>hr]:border-gray-500 [&>hr]:my-4
          [&>a]:text-blue-400 [&>a]:underline [&>a]:hover:text-blue-300
          [&>strong]:font-bold
          [&>em]:italic
          [&>u]:underline
          [&>s]:line-through
          [&>mark]:bg-yellow-200 [&>mark]:text-black
          [&>small]:text-sm
          [&>sub]:text-xs [&>sub]:align-sub
          [&>sup]:text-xs [&>sup]:align-super
          [&>del]:line-through [&>del]:text-gray-500
          [&>ins]:underline
          [&>kbd]:bg-gray-700 [&>kbd]:text-white [&>kbd]:px-2 [&>kbd]:py-1 [&>kbd]:rounded [&>kbd]:text-sm [&>kbd]:border [&>kbd]:border-gray-600
          [&>samp]:bg-gray-700 [&>samp]:text-green-400 [&>samp]:px-1 [&>samp]:py-0.5 [&>samp]:rounded [&>samp]:text-sm
          [&>var]:italic [&>var]:text-purple-400
          [&>abbr]:border-b [&>abbr]:border-dotted [&>abbr]:border-gray-400
          [&>acronym]:border-b [&>acronym]:border-dotted [&>acronym]:border-gray-400
          [&>cite]:italic [&>cite]:text-gray-400
          [&>dfn]:italic [&>dfn]:font-semibold
          [&>time]:text-gray-400
          [&>q]:italic [&>q]:text-gray-400
          [&>samp]:font-mono
          [&>var]:font-mono
          [&>kbd]:font-mono
          [&>code]:font-mono
          [&>pre]:font-mono
          [&_span]:inline
        "
      />
    );
  }

  // 根据messageType生成消息样式
  const getMessageStyle = (msg: Message) => {
    if (msg.role === 'user') {
      return 'bg-gray-100 self-end text-gray-700';
    }
    
    // 助手消息根据messageType设置样式
    // switch (msg.messageType) {
    //   case 'reasoning':
    //     return 'bg-[#23232a] self-start text-gray-400';
    //   case 'warning':
    //     return 'bg-[#23232a] self-start text-orange-400';
    //   case 'error':
    //     return 'bg-[#23232a] self-start text-red-400';
    //   default:
    //     return 'bg-[#23232a] self-start text-white';
    // }
  };

  // 多文件上传处理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const newFileIds: string[] = [];
    const newFileNames: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/file-upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.status === 200 && data.file_id) {
          newFileIds.push(data.file_id);
          newFileNames.push(file.name);
        } else {
          setUploadError(data.error || '上传失败');
        }
      } catch {
        setUploadError('网络错误，上传失败');
      }
    }
    setFileIds(prev => [...prev, ...newFileIds]);
    setFileNames(prev => [...prev, ...newFileNames]);
    setUploading(false);
    // 清空 input 以便连续上传
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 对话区 - 可滚动区域 */}
      <div className="flex-1 w-full flex flex-col items-center overflow-y-auto min-h-0">
        <div className="w-full max-w-[1100px] mx-auto flex flex-col gap-4 p-4 pt-8 pb-32">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-white-500 animate-spin" />
                <span className="text-gray-400 text-sm">加载中...</span>
              </div>
            </div>
          ) : !isLoading && messages.length === 0 ? (
            <div className="p-3 rounded-lg bg-[#23232a] self-start text-white">
              hi，我是愚公，在此开启你的智能探索
              {/* {currentAgentName ? (
                <div>
                  <div className="mb-2">
                    <span className="text-green-400 font-semibold">当前Agent:</span> {currentAgentName}
                    {agentOrganization && (
                      <span className="text-gray-400 ml-2">({agentOrganization})</span>
                    )}
                  </div>
                  <div>你好，我是{currentAgentName}，请问有什么可以帮你?</div>
                </div>
              ) : (
                "hi，我是愚公，在此开启你的探索之旅"
              )} */}
            </div>
          ) : null}
          {(() => {
            const renderedMessages: JSX.Element[] = [];
            let i = 0;
            
            while (i < messages.length) {
              const currentMsg = messages[i];

              // 如果是用户消息，直接渲染
              if (currentMsg.role === 'user') {
                renderedMessages.push(
                  <div
                    key={i}
                    className={`p-2 rounded-lg ${getMessageStyle(currentMsg)}`}
                  >
                    {renderMessageContent(currentMsg.content || '')}
                  </div>
                );
                i++;
                continue;
              }
              
              // 如果是助手消息且是agent消息，需要合并相同agentId的连续消息
              if (currentMsg.role === 'assistant' && currentMsg.source === 'agent' && currentMsg.agentId) {
                const agentId = currentMsg.agentId;
                const providerUrl = currentMsg.providerUrl;
                // const source = currentMsg.source;
                
                // 收集相同agentId的连续消息内容
                const contentParts: Array<{ type: 'text' | 'file', content: string }> = [];
                let j = i;
                
                while (j < messages.length && 
                       messages[j].role === 'assistant' && 
                       messages[j].source === 'agent' && 
                       messages[j].agentId === agentId) {
                  
                  const msg = messages[j];
                  if (msg.content) {
                    contentParts.push({ type: 'text', content: msg.content });
                  }
                  if (msg.fileId) {
                    contentParts.push({ type: 'file', content: msg.fileId });
                  }
                  j++;
                }
                
                // 渲染合并后的agent消息框
                renderedMessages.push(
                  <div
                    key={i}
                    className={`p-2 rounded-lg ${getMessageStyle(currentMsg)}`}
                  >
                    <div className="bg-[#23232a] h-auto w-full max-w-[1100px] p-2 rounded-2xl">
                      {/* Agent 消息头部信息 */}
                      <div className="mb-2 pb-2">
                        <div className="flex items-center gap-2">
                          {providerUrl ? (
                            <a 
                              href={providerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-200 text-sm hover:text-blue-100 cursor-pointer"
                            >
                              🤖 @{agentId}
                            </a>
                          ) : (
                            <span className="text-blue-200 text-sm">🤖 @{agentId}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Agent 消息内容 - 按顺序渲染文本和文件 */}
                      {contentParts.map((part, partIdx) => (
                        <div key={partIdx}>
                          {part.type === 'text' && processHTMLContent(part.content)}
                          {part.type === 'file' && <FilePreviewList fileIds={[part.content]} />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
                
                i = j; // 跳过已处理的消息
                continue;
              }
              
              // 其他助手消息，直接渲染
              renderedMessages.push(
                <div
                  key={i}
                  className={`p-2 rounded-lg ${getMessageStyle(currentMsg)}`}
                >
                  {renderAssistantContent(currentMsg.content || '', currentMsg.agentId, currentMsg.providerUrl, currentMsg.source, currentMsg.fileId)}
                </div>
              );
              i++;
            }
            
            return renderedMessages;
          })()}
        </div>
      </div>
      {/* 输入框区域 - 固定在底部 */}
      <div className="flex-shrink-0 w-full max-w-[1075px] mx-auto p-2 flex items-end pb-8">
        {/* 输入框和按钮区域 */}
        <div className="flex-1 relative group"
             onMouseEnter={() => setIsInputHovered(true)}
             onMouseLeave={() => setIsInputHovered(false)}>
          <div className={`bg-[#23232a] rounded-2xl w-full pl-4 py-4 min-h-[110px] flex items-start border transition-all duration-300 relative ${
            isInputHovered 
              ? 'border-white/40' 
              : 'border-[#33343a]'
          }`}>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-none outline-none text-white placeholder:text-gray-400 text-sm resize-none leading-5 min-h-[px]"
                placeholder={!getDisplayValue() ? "自“愚”一下，生活更美好" : ""}
                value={getDisplayValue()}
                onChange={(e) => handleInputChange(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={handleCompositionEnd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isComposing) { 
                    e.preventDefault(); 
                    if (isRunning) {
                      // 当前存在运行的任务，显示提示
                      getCursorPosition();
                      setTipMessage('当前存在运行的任务');
                      setShowSingleMentionTip(true);
                      setTipPosition(cursorPosition);
                      setTimeout(() => setShowSingleMentionTip(false), 5000);
                    } else if (uploading) {
                      setUploadError('文件上传中，请稍后再试');
                    } else {
                      handleSend(); 
                    }
                  } else if (e.key === 'Enter' && isComposing) {
                    // 在输入法组合期间，不阻止Enter键的默认行为
                    return;
                  } else if (e.key === 'Backspace' && currentAgentName) {
                    // 判断光标是否在@mention标签后面
                    const textarea = e.target as HTMLTextAreaElement;
                    const agentDisplay = getAgentDisplayName();
                    const mentionText = `@${agentDisplay} `;
                    // const fullValue = getDisplayValue();
                    const cursorPos = textarea.selectionStart || 0;
                    // mention标签的起止位置
                    const mentionStart = mentionPosition;
                    const mentionEnd = mentionPosition + mentionText.length;
                    // 如果光标正好在@mention标签后面
                    if (cursorPos === mentionEnd) {
                      e.preventDefault();
                      // 删除@mention标签
                      const before = input.substring(0, mentionStart);
                      const after = input.substring(mentionStart);
                      setInput(before + after);
                      clearAgent();
                      // 将光标移到mentionStart
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = mentionStart;
                          textareaRef.current.focus();
                        }
                      }, 0);
                    } else if (input === '') {
                      // 兼容原有：输入为空时也能删
                      e.preventDefault();
                      clearAgent();
                    }
                  } else if (e.key === 'Escape') {
                    // 按ESC键关闭搜索结果
                    setShowSearchResults(false);
                  } else if (e.key === '@' && currentAgentName) {
                    // 新增：键盘输入@时也弹提示
                    getCursorPosition();
                    setTipMessage('目前支持最多指定一个agent');
                    setShowSingleMentionTip(true);
                    setTipPosition(cursorPosition);
                    setTimeout(() => setShowSingleMentionTip(false), 3000);
                  }
                }}
                style={{ 
                  marginRight: 64,
                  resize: 'none',
                  overflow: 'hidden'
                }}
                onInput={(e) => {
                  // 自动调整高度
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              {/* 为@mention部分添加颜色覆盖 */}
              {currentAgentName && (
                <div
                  className="absolute inset-0 pointer-events-none text-sm leading-5"
                  style={{
                    marginRight: 64,
                    // 保证和textarea一致
                    padding: '0px', // 或与textarea一致
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    color: 'inherit',
                  }}
                >
                  {(() => {
                    const agentDisplay = getAgentDisplayName();
                    const mentionText = `@${agentDisplay} `;
                    
                    if (mentionPosition >= 0 && mentionPosition <= input.length) {
                      // 在指定位置显示@mention
                      const before = input.substring(0, mentionPosition);
                      const after = input.substring(mentionPosition);
                      return (
                        <>
                          <span className="text-transparent">{before}</span>
                          <span className="text-white">{mentionText}</span>
                          <span className="text-transparent">{after}</span>
                        </>
                      );
                    } else {
                      // 默认在开头显示
                      return (
                        <>
                          <span className="text-white">{mentionText}</span>
                          <span className="text-transparent">{input}</span>
                        </>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
            {/* @mention唯一性提示 */}
            {showSingleMentionTip && (
              <div
                className="fixed z-50 text-red-500 text-xs"
                style={{
                  left: tipPosition.x + 10,
                  top: tipPosition.y - 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tipMessage}
              </div>
            )}
            {/* 按钮组绝对定位到输入框右下角 */}
            <div className="absolute bottom-3 right-4 flex items-center gap-2">
              {/* 文件名列表 */}
              {fileNames.length > 0 && (
                <div className="flex flex-row-reverse items-end mr-2 gap-1 w-120">
                {fileNames.map((name, idx) => (
                  <div
                    key={idx}
                    className="relative w-full text-xs text-gray-400 bg-[#23232a] px-2 py-1 rounded pl-5 pr-2 overflow-hidden"
                    style={{ minHeight: 24, maxWidth: '128px' }}
                  >
                    {/* 删除按钮 */}
                    <button
                      className="absolute left-1 top-1 w-4 h-4 flex items-center justify-center bg-red-500 border-2 border-white text-white rounded-full shadow hover:bg-red-600 transition cursor-pointer"
                      style={{ fontSize: 10 }}
                      onClick={() => {
                        setFileIds(prev => prev.filter((_, i) => i !== idx));
                        setFileNames(prev => prev.filter((_, i) => i !== idx));
                      }}
                      tabIndex={-1}
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="block truncate text-white" title={name}>{name}</span>
                  </div>
                ))}
              </div>
              )}
              <label
                className={`group flex items-center justify-center rounded-full bg-transparent transition-colors w-10 h-10 p-0
                  ${fileNames.length >= 5 || uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-blue-600'}`}
                title={
                  fileNames.length >= 5
                    ? '目前最多支持5个文件'
                    : '点击上传图片与文件'
                }
              >
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading || fileNames.length >= 5}
                  multiple
                />
                {uploading ? (
                  <Loader2 className={`w-6 h-6 text-gray-300 animate-spin ${fileNames.length >= 5 || uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                ) : (
                  <Plus className={`w-6 h-6 text-gray-300 ${fileNames.length >= 5 || uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                )}
              </label>
              <button
                className={`rounded-full w-10 h-10 flex items-center justify-center transition-colors
                  ${isCancelling 
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                    : isRunning 
                      ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer animate-pulse' 
                      : input.trim() && !uploading 
                        ? 'bg-[#e5e5e5] text-black hover:bg-blue-600 hover:text-white cursor-pointer' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                onClick={() => {
                  console.log('发送按钮被点击');
                  console.log('isRunning:', isRunning);
                  console.log('isCancelling:', isCancelling);
                  console.log('onCancelRun:', onCancelRun);
                  if (isCancelling) {
                    console.log('正在取消中，忽略点击');
                    return;
                  } else if (isRunning) {
                    console.log('调用 onCancelRun');
                    onCancelRun?.();
                  } else if (input.trim()) {
                    console.log('调用 handleSend');
                    handleSend();
                  }
                }}
                disabled={isCancelling || (!isRunning && (!input.trim() || uploading))}
                title={isCancelling ? '已取消，请稍候' : isRunning ? '正在运行，点击取消' : '发送消息'}
              >
                {isCancelling || isRunning ? <StopCircle className="w-5 h-5" /> : <ArrowUp className="w-5 h-5" />}
              </button>
            </div>
            {/* 上传错误提示 */}
            {uploadError && (
              <div className="absolute left-4 bottom-3 text-xs text-red-400">{uploadError}</div>
            )}
          </div>
          
          {/* Agent搜索结果下拉列表 */}
          {showSearchResults && (
            <div 
              className="fixed bg-gradient-to-b from-[#2a2a32] to-[#1f1f25] rounded-xl border border-[#404048] shadow-2xl backdrop-blur-sm max-h-60 overflow-y-auto z-50 min-w-[240px] max-w-[320px] flex flex-col-reverse"
              style={{
                left: `${cursorPosition.x + 14}px`, // 右移一点
                top: `${cursorPosition.y - 35}px`,   // 稍微上移
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
                transform: 'translateY(-100%)',     // 整体上移到光标上方
              }}
            >
              {isSearchingAgents ? (
                <div className="p-6 text-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
                  <span className="text-sm">推荐中...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <span className="text-sm">
                    {searchPrefix ? `未找到匹配 "${searchPrefix}" 的Agent` : '输入@开始搜索Agent'}
                  </span>
                </div>
              ) : (
                <div className="py-2 flex flex-col-reverse">
                  {searchResults.map((agent, idx) => {
                    const parts = agent.split("|");
                    const name = parts[0];
                    const org = parts.length > 1 ? parts[1] : undefined;
                    
                    return (
                      <div
                        key={idx}
                        className="mx-2 px-2 py-1 hover:bg-gradient-to-r hover:from-[#3a3a42] hover:to-[#36363e] cursor-pointer flex items-center rounded-lg transition-all duration-200 ease-in-out hover:shadow-md"
                        onClick={() => selectAgent(agent)}
                      >
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm">{name}{org && `|${org}`}</span>
                          {/* {org && (
                            <span className="text-gray-400 text-xs mt-1">{org}</span>
                          )} */}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const FilePreviewList = React.memo(({ fileIds }: { fileIds: string[] }) => {
  const [fileTypes, setFileTypes] = React.useState<(string | null)[]>(Array(fileIds.length).fill(null));
  const [loading, setLoading] = React.useState<boolean[]>(Array(fileIds.length).fill(true));
  // 图片预览状态
  const [previewImg, setPreviewImg] = React.useState<string | null>(null);
  // 新增：视频预览状态
  const [previewVideo, setPreviewVideo] = React.useState<string | null>(null);
  
  // 使用useMemo缓存URL，避免每次渲染都生成新的URL
  const imageUrls = React.useMemo(() => {
    return fileIds.map(fileId => `/api/file-download?file_id=${fileId}`);
  }, [fileIds]);

  // 使用useCallback缓存handleLoaded函数，避免重复创建
  const handleLoaded = React.useCallback((idx: number) => {
    console.log(`图片加载完成: index ${idx}`);
    setLoading(prev => {
      const arr = [...prev];
      arr[idx] = false;
      return arr;
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    
    const timeoutId = setTimeout(async () => {
      try {
        // 获取文件类型
        const typePromises = fileIds.map(async (fileId) => {
          try {
            const response = await fetch(`/api/file-download?file_id=${fileId}`, {
              method: 'HEAD',
              signal: AbortSignal.timeout(3000)
            });
            return response.headers.get('content-type') || 'image/jpeg';
          } catch (error) {
            console.log(`获取文件类型失败: ${fileId}`, error);
            return 'image/jpeg'; // 默认假设为图片
          }
        });
        
        const types = await Promise.all(typePromises);
        if (!cancelled) {
          setFileTypes(types);
        }
      } catch (error) {
        console.error('获取文件类型失败:', error);
        if (!cancelled) {
          setFileTypes(fileIds.map(() => 'image/jpeg'));
        }
      }
    }, 50);
    
    return () => { 
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fileIds]);

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {fileIds.map((fileId, idx) => {
          const url = imageUrls[idx];
          const type = fileTypes[idx];

          // 根据文件类型进行不同展示
          if (!type) {
            // 类型未知，显示加载中
            return (
              <div 
                key={fileId}
                className="relative max-w-[360px] max-h-[360px] flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden" 
                style={{ width: 360, height: 360 }}
              >
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                  <span className="ml-2 text-gray-400 text-sm">检测文件类型中...</span>
                </div>
              </div>
            );
          }

          if (type.startsWith('image/')) {
            // 图片文件
            return (
              <div 
                key={fileId}
                className="relative max-w-[360px] max-h-[360px] flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden" 
                style={{ width: 360, height: 360 }}
              >
                {loading[idx] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                    <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                  </div>
                )}
                <Image
                  src={url}
                  alt="图片"
                  className="max-w-[360px] max-h-[360px] object-contain cursor-pointer"
                  style={loading[idx] ? { visibility: 'hidden' } : {}}
                  onLoad={() => handleLoaded(idx)}
                  onError={() => {
                    console.log(`图片加载失败: ${url}`);
                    handleLoaded(idx);
                  }}
                  onClick={() => setPreviewImg(url)}
                  loading="lazy"
                  crossOrigin="anonymous"
                />
              </div>
            );
          }

          if (type.startsWith('video/')) {
            // 视频文件
            return (
              <div 
                key={fileId}
                className="relative max-w-[360px] max-h-[360px] flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden" 
                style={{ width: 360, height: 360 }}
              >
                {loading[idx] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                    <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
                  </div>
                )}
                <video
                  src={url}
                  className="max-w-[360px] max-h-[360px] object-contain cursor-pointer"
                  style={loading[idx] ? { visibility: 'hidden' } : {}}
                  onLoadedData={() => handleLoaded(idx)}
                  onError={() => {
                    console.log(`视频加载失败: ${url}`);
                    handleLoaded(idx);
                  }}
                  onClick={() => setPreviewVideo(url)}
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                />
              </div>
            );
          }

          if (type.startsWith('audio/')) {
            // 音频文件
            return (
              <div 
                key={fileId}
                className="relative max-w-[360px] h-20 flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden" 
                style={{ width: 360 }}
              >
                <div className="flex items-center justify-center w-full p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">🎵</span>
                    </div>
                    <div className="flex-1">
                      <audio
                        src={url}
                        controls
                        className="w-full"
                        onLoadedData={() => handleLoaded(idx)}
                        onError={() => {
                          console.log(`音频加载失败: ${url}`);
                          handleLoaded(idx);
                        }}
                        preload="metadata"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 其他文件类型（文档、压缩包等）
          return (
            <div 
              key={fileId}
              className="relative max-w-[360px] h-20 flex items-center justify-center bg-gray-800 rounded border border-gray-700 overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors" 
              style={{ width: 360 }}
              onClick={() => window.open(url, '_blank')}
            >
              <div className="flex items-center justify-center w-full p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">
                      {type.includes('pdf') ? '📄' : 
                       type.includes('word') || type.includes('document') ? '📝' : 
                       type.includes('excel') || type.includes('spreadsheet') ? '📊' : 
                       type.includes('zip') || type.includes('rar') || type.includes('tar') ? '📦' : 
                       type.includes('text') ? '📄' : '📎'}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white text-sm font-medium truncate">
                      {type.split('/')[1]?.toUpperCase() || '文件'}
                    </div>
                    <div className="text-gray-400 text-xs">
                      点击下载
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 图片预览弹窗 */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-zoom-out"
          onClick={() => setPreviewImg(null)}
        >
          <Image src={previewImg} alt="大图预览" className="max-w-[90vw] max-h-[90vh] rounded shadow-lg" />
        </div>
      )}
      {/* 视频预览弹窗 */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-zoom-out"
          onClick={() => setPreviewVideo(null)}
        >
          <video 
            src={previewVideo} 
            controls 
            autoPlay 
            className="max-w-[90vw] max-h-[90vh] rounded shadow-lg bg-black" 
            onClick={(e) => e.stopPropagation()} // 防止点击视频时关闭弹窗
          />
        </div>
      )}
    </>
  );
});

FilePreviewList.displayName = 'FilePreviewList';

ChatArea.displayName = 'ChatArea';

export default ChatArea;
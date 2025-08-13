'use client';

import React from 'react';
import { Search, Share2, MessageCircle, LogOut, LogIn, Bot, User, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image'

import { useAuth } from './AuthContext';

interface Navbar2Props {
  currentPage?: 'share' | 'discover' | 'explore' | 'mine';
  onPageChange?: (page: 'share' | 'discover' | 'explore' | 'mine') => void;
}

export default function Navbar2({ currentPage = 'share' }: Navbar2Props) {
  const { userId, logout, openLogin, isLoading } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const maskedUserId = React.useMemo(() => {
    if (!userId) return '';
    const s = String(userId).trim();
    // 如果是邮箱格式，显示第一个字符
    if (s.includes('@')) {
      return s.charAt(0).toUpperCase();
    }
    // 保持原有的手机号处理逻辑作为兼容
    if (/^\d{11}$/.test(s)) return s.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
    if (s.length > 7) return s.slice(0, 3) + '****' + s.slice(-4);
    return s;
  }, [userId]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handlePageSwitch = (page: 'share' | 'discover' | 'explore' | 'mine') => {
    if (page === currentPage) {
      return;
    }
    
    if (page === 'discover') {
      window.location.href = '/agent-space-discover';
    } else if (page === 'share') {
      window.location.href = '/agent-space-share';
    } else if (page === 'explore') {
      window.location.href = '/';
    } else if (page === 'mine') {
      window.location.href = '/mine';
    }
  };

  return (
    <>
      <div className="w-full fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        
        <div className="w-full px-0 py-2">
          <div className="flex items-center justify-between h-12 relative">
            <div className="flex items-center pl-4">
              <Link href="/" className="cursor-pointer flex items-center gap-0.5">
                <Image 
                  src="/yu_logo.jpg" 
                  alt="愚公社区Logo" 
                  className="w-5.5 h-5.5 rounded-full object-cover"
                />
                {/* <h1 className="mixed-font text-gray-300 text-sm font-bold hover:bg-gray-600/30 hover:text-white"> */}
                <h1 className="mixed-font text-gray-300 text-sm font-bold">
                  愚公社区
                </h1>
              </Link>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative flex items-center gap-1.5 p-1 border border-gray-600/40 rounded-lg bg-gray-800/20 backdrop-blur-sm pointer-events-auto z-10">
              <motion.button 
                 onClick={() => handlePageSwitch('explore')}
                 className={`mixed-font group relative flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-md overflow-hidden transition-all duration-300 ${
                   currentPage === 'explore' 
                     ? 'text-blue-300 bg-blue-500/20 cursor-default opacity-75' 
                     : 'text-gray-400 hover:text-gray-300 bg-transparent hover:bg-gray-500/20 cursor-pointer'
                 }`}
                 whileHover={currentPage !== 'explore' ? { scale: 1.02 } : {}}
                 whileTap={currentPage !== 'explore' ? { scale: 0.98 } : {}}
               >
                 <div className="relative z-10 flex items-center gap-1">
                   <MessageCircle className="w-3 h-3" />
                   <span>探索</span>
                 </div>
               </motion.button>
                <motion.button 
                onClick={() => handlePageSwitch('share')}
                className={`mixed-font group relative flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-md overflow-hidden transition-all duration-300 ${
                  currentPage === 'share' 
                    ? 'text-purple-300 bg-purple-500/20 cursor-default opacity-75' 
                    : 'text-gray-400 hover:text-gray-300 bg-transparent hover:bg-gray-500/20 cursor-pointer'
                }`}
                whileHover={currentPage !== 'share' ? { scale: 1.02 } : {}}
                whileTap={currentPage !== 'share' ? { scale: 0.98 } : {}}
              >
                <div className="relative z-10 flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  <span>分享</span>
                </div>
              </motion.button>

                <motion.button 
                 onClick={() => handlePageSwitch('discover')}
                 className={`mixed-font group relative flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-md overflow-hidden transition-all duration-300 ${
                   currentPage === 'discover' 
                     ? 'text-green-300 bg-green-500/20 cursor-default opacity-75' 
                     : 'text-gray-400 hover:text-gray-300 bg-transparent hover:bg-gray-500/20 cursor-pointer'
                 }`}
                 whileHover={currentPage !== 'discover' ? { scale: 1.02 } : {}}
                 whileTap={currentPage !== 'discover' ? { scale: 0.98 } : {}}
               >
                 <div className="relative z-10 flex items-center gap-1">
                   <Search className="w-3 h-3" />
                   <span>发现</span>
                 </div>
               </motion.button>

                <motion.button 
                 onClick={() => handlePageSwitch('mine')}
                 className={`mixed-font group relative flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-md overflow-hidden transition-all duration-300 ${
                   currentPage === 'mine' 
                     ? 'text-orange-300 bg-orange-500/20 cursor-default opacity-75' 
                     : 'text-gray-400 hover:text-gray-300 bg-transparent hover:bg-gray-500/20 cursor-pointer'
                 }`}
                 whileHover={currentPage !== 'mine' ? { scale: 1.02 } : {}}
                 whileTap={currentPage !== 'mine' ? { scale: 0.98 } : {}}
               >
                 <div className="relative z-10 flex items-center gap-1">
                   <User className="w-3.5 h-3.5" />
                   <span>我的</span>
                 </div>
               </motion.button>

              
              </div>
            </div>

            <div className="flex items-center pr-4 w-28 justify-end flex-shrink-0">
              {isLoading ? (
                <div className="w-16 h-6 rounded animate-pulse"></div>
              ) : userId ? (
                <>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      className="mixed-font flex items-center gap-1 px-2 py-1 bg-transparent text-gray-300 text-sm font-semibold rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-600/30 hover:text-white overflow-hidden whitespace-nowrap text-ellipsis max-w-full"
                      onClick={() => setUserMenuOpen((o) => !o)}
                    >
                      {maskedUserId}
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 rounded-md shadow-lg z-50 bg-gray-800/90 border border-gray-600/50 backdrop-blur-sm">
                        <div className="mixed-font px-2 py-1 w-32 text-gray-400 text-xs border-b border-gray-600/30 mb-1 pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                          {userId && userId.length > 20 ? userId.slice(0, 20) + '...' : userId}
                        </div>
                        <button
                          className="mixed-font flex items-center gap-1 px-2 py-1 w-32 bg-transparent text-gray-300 text-sm font-semibold rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-600/30 hover:text-white"
                          onClick={() => {
                            if (userId) {
                              window.location.href = '/mine';
                              return;
                            }
                            // 未登录时，先弹出登录框；登录成功后再跳转；取消则不跳转
                            openLogin(
                              () => { window.location.href = '/mine'; },
                              () => { /* 取消不做跳转 */ }
                            );
                          }}
                        >
                          <Bot className="w-4 h-4" />
                          我的agent
                        </button>
                        <button
                          className="mixed-font flex items-center gap-1 px-2 py-1 w-32 bg-transparent text-gray-300 text-sm font-semibold rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-600/30 hover:text-white"
                          onClick={() => {
                            if (userId) {
                              window.location.href = '/mine?tab=my-favorate';
                              return;
                            }
                            // 未登录时，先弹出登录框；登录成功后再跳转；取消则不跳转
                            openLogin(
                              () => { window.location.href = '/mine?tab=my-favorate'; },
                              () => { /* 取消不做跳转 */ }
                            );
                          }}
                        >
                          <Star className="w-4 h-4" />
                          我的收藏
                        </button>
                        <button
                          className="mixed-font flex items-center gap-1 px-2 py-1 w-32 bg-transparent text-gray-300 text-sm font-semibold rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-600/30 hover:text-white"
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button 
                  className="mixed-font flex items-center gap-1 px-2 py-1 bg-transparent text-gray-300 text-sm font-semibold rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-600/30 hover:text-white"
                  onClick={() => openLogin()}
                >
                  <LogIn className="w-4 h-4" />
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const cn = (...classes: (string | undefined)[]) => clsx(classes);

interface ModernInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
}

export default function ModernInput({
  placeholder = "What do you want to stay updated about, and when should we notify you?",
  value = "",
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  className,
  multiline = false
}: ModernInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const handleSubmit = () => {
    if (inputValue.trim() && !loading && !disabled) {
      onSubmit?.(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 如果正在使用输入法组合输入，不执行提交操作
      if (isComposing) {
        return;
      }
      // 对于多行模式，Shift+Enter换行，Enter提交
      if (multiline && e.shiftKey) {
        // Shift+Enter，允许换行，不阻止默认行为
        return;
      }
      // Enter提交（单行模式或多行模式不按Shift）
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <motion.div
        className="relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background glow effect */}
        <motion.div
          className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          animate={{
            opacity: isHovered || isFocused ? 1 : 0,
            scale: isHovered || isFocused ? 1.02 : 1,
          }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Main input container */}
        <motion.div
          className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden"
          animate={{
            borderColor: isFocused ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)',
            boxShadow: isFocused 
              ? '0 0 0 1px rgba(59, 130, 246, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Input field */}
          {multiline ? (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={placeholder}
                disabled={disabled || loading}
                rows={4}
                style={{
                  minHeight: '120px',
                  maxHeight: '300px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
                }}
                className={cn(
                  "w-full bg-transparent px-6 py-3 pr-16 text-white placeholder:text-gray-400 focus:outline-none text-sm resize-none overflow-y-auto",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  // 自定义滚动条样式
                  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-white/30"
                )}
              />
              
              {/* Submit button - positioned at bottom right with proper spacing */}
              <motion.button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || loading || disabled}
                className={cn(
                  "absolute bottom-3 right-3 p-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg",
                  "hover:from-blue-600 hover:to-purple-700 transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600",
                  "flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer z-10"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Send className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={placeholder}
                disabled={disabled || loading}
                className={cn(
                  "flex-1 bg-transparent px-6 py-2.5 text-white placeholder:text-gray-400 focus:outline-none text-sm",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              />
              
              {/* Submit button */}
              <motion.button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || loading || disabled}
                className={cn(
                  "mr-1 p-1.5 rounded-md bg-gradient-to-r from-blue-500 to-purple-600 text-white",
                  "hover:from-blue-600 hover:to-purple-700 transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-purple-600",
                  "flex items-center justify-center min-w-[30px] min-h-[30px] cursor-pointer"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, rotate: 0 }}
                      animate={{ opacity: 1, rotate: 360 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Floating label animation */}
        {/* <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute -top-3 left-4 px-2 bg-gradient-to-r from-[#1a1d29] to-[#202235] text-xs text-blue-400 font-medium rounded"
            >
              Enter your query
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Progress indicator */}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-600/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full w-1/5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              initial={{ x: '-100%' }}
              animate={{ x: '400%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Helper text */}
      {/* <motion.p
        className="mt-3 text-sm text-gray-400 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Press Enter to submit or click the button
      </motion.p> */}
    </div>
  );
} 
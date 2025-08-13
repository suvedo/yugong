'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SUGGESTIONS = [
  "世界无法继续改变，除非加入一点点疯狂",
  "在这个时代，最大的冒险就是不冒险",
  "什么是疯子？\n就是重复做同样的事情，还期待有不同的结果",
  "未来已经在这里，只是没有平均分布",
  "勇敢的人先享受世界",
  "预测未来最好的办法就是把它创造出来"
];

const DEFAULT_POSITIONS = [
  { left: 15, top: 25 },
  { left: 65, top: 35 },
  { left: 25, top: 55 },
  { left: 75, top: 15 }
];

function generateNonOverlappingPositions(suggestions: string[]): Array<{left: number, top: number}> {
  const positions: Array<{left: number, top: number}> = [];
  const minDistance = 300;
  const maxAttempts = 50;

  for (let i = 0; i < suggestions.length; i++) {
    let attempts = 0;
    let position: {left: number, top: number};

    do {
      position = {
        left: Math.random() * 70 + 10,
        top: Math.random() * 50 + 20,
      };
      attempts++;
    } while (
      attempts < maxAttempts &&
      positions.some(pos => {
        const distance = Math.sqrt(
          Math.pow((position.left - pos.left) * (typeof window !== 'undefined' ? window.innerWidth : 1200) / 100, 2) +
          Math.pow((position.top - pos.top) * (typeof window !== 'undefined' ? window.innerHeight : 800) / 100, 2)
        );
        return distance < minDistance;
      })
    );

    positions.push(position);
  }

  return positions;
}

export default function FloatingElements() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);





  // 使用固定位置作为服务器端默认值
  // 使用模块级常量 DEFAULT_POSITIONS

  const positions = useMemo(() => {
    if (!isClient) {
      return DEFAULT_POSITIONS;
    }
    return generateNonOverlappingPositions(SUGGESTIONS);
  }, [isClient]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Floating suggestion tags */}
      {SUGGESTIONS.map((suggestion: string, index: number) => (
        <motion.div
          key={index}
          className="absolute  px-4 py-2 text-sm text-gray-300"
          initial={{ opacity: 0, y: 50 }}
          animate={{ 
            opacity: [0, 0.7, 0.7, 0.7, 0],
            y: [0, -50, -100, -150, -200],
            x: [0, Math.random() * 100 - 50, Math.random() * 150 - 75, Math.random() * 200 - 100, Math.random() * 250 - 125]
          }}
          transition={{
            duration: 20,
            delay: index * 4,
            repeat: Infinity,
            repeatDelay: 25,
            ease: "easeInOut"
          }}
          style={{
            left: `${positions[index]?.left || 10 + index * 20}%`,
            top: `${positions[index]?.top || 30 + index * 10}%`,
          }}
        >
          {suggestion.split('\n').map((line: string, lineIndex: number) => (
            <div key={lineIndex}>
              {line}
            </div>
          ))}
        </motion.div>
      ))}

      {/* Floating icons */}
      <motion.div
        className="absolute w-8 h-8 bg-blue-500/20 rounded-full"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        style={{ left: '15%', top: '25%' }}
      />
      
      <motion.div
        className="absolute w-6 h-6 bg-purple-500/20 rounded-full"
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 0.8, 1],
          opacity: [0.4, 0.8, 0.4]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        style={{ right: '20%', top: '15%' }}
      />
      
      <motion.div
        className="absolute w-4 h-4 bg-cyan-500/20 rounded-full"
        animate={{
          x: [0, 60, 0],
          y: [0, -30, 0],
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        style={{ left: '75%', bottom: '25%' }}
      />
    </div>
  );
} 
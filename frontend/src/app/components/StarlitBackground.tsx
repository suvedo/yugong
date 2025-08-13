'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

export default function StarlitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端运行
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const createParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.min(50, Math.floor(canvas.width / 30));
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 2,
          opacity: Math.random() * 0.6 + 0.4,
          color: Math.random() > 0.5 ? '#3b82f6' : '#8b5cf6'
        });
      }
      
      particlesRef.current = particles;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Bounce off edges
        if (particle.x <= 0 || particle.x >= canvas.width) {
          particle.vx *= -1;
        }
        if (particle.y <= 0 || particle.y >= canvas.height) {
          particle.vy *= -1;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        
        // Draw connections
        particlesRef.current.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 120) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = particle.color;
              ctx.globalAlpha = (1 - distance / 120) * 0.3;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        });
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createParticles();
    animate();

    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isClient]);

  // 在服务器端或客户端初始化时显示静态背景
  if (!isClient) {
    return (
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d29] via-[#202235] to-[#252841]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#1a1d29] via-[#202235] to-[#252841]"
        animate={{
          background: [
            'linear-gradient(to bottom right, rgba(26, 29, 41, 0.8), rgba(32, 34, 53, 0.6), rgba(37, 40, 65, 0.8))',
            'linear-gradient(to bottom right, rgba(32, 34, 53, 0.8), rgba(37, 40, 65, 0.6), rgba(26, 29, 41, 0.8))',
            'linear-gradient(to bottom right, rgba(26, 29, 41, 0.8), rgba(32, 34, 53, 0.6), rgba(37, 40, 65, 0.8))',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      {/* Animated gradient orbs - 增强可见性 */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-2xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-purple-500/25 rounded-full blur-2xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 60, 0],
          scale: [1, 0.7, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
      
      {/* 新增一个明显的测试动画 */}
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/40 rounded-full blur-xl"
        animate={{
          rotate: [0, 360],
          scale: [0.5, 1.5, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-80"
        style={{ mixBlendMode: 'normal' }}
      />

      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#18181c]/20 via-transparent to-[#18181c]/10" />
    </div>
  );
} 
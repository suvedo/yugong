
export default function Background() {
    return (
    <>
        <div className="absolute inset-0 pointer-events-none z-[-1]">
            {/* 主背景渐变（更纯净的白色） */}
            <div className="absolute inset-0 bg-white" />
            
            {/* 静态模糊球体 */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-200/20 via-violet-200/20 to-purple-200/20 rounded-full blur-3xl opacity-60 transition-opacity duration-1000" />
            <div className="absolute -top-20 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-pink-200/20 via-rose-200/20 to-purple-200/20 rounded-full blur-3xl opacity-50 transition-opacity duration-1000" />
            <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-r from-indigo-200/20 via-blue-200/20 to-violet-200/20 rounded-full blur-3xl opacity-40 transition-opacity duration-1000" />
            
            {/* 装饰元素 */}
            {/* 左侧装饰 */}
            <div className="absolute top-20 left-[5%] w-24 h-24 rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 backdrop-blur-sm animate-float-slow" />
            <div className="absolute top-40 left-[10%] w-16 h-16 rounded-xl rotate-45 border border-purple-200/20 backdrop-blur-sm animate-spin-slow" />
            <div className="absolute bottom-32 left-[8%] w-20 h-20 rounded-lg bg-gradient-to-tr from-emerald-400/10 to-cyan-400/10 backdrop-blur-sm animate-float-medium" />
            <div className="absolute bottom-60 left-[15%] w-12 h-12 rotate-12 border-2 border-blue-200/20 backdrop-blur-sm animate-spin-reverse" />
            
            {/* 右侧装饰 */}
            <div className="absolute top-32 right-[15%] w-20 h-20 rounded-full bg-gradient-to-r from-pink-400/10 to-purple-400/10 backdrop-blur-sm animate-float-medium" />
            <div className="absolute top-60 right-[10%] w-16 h-16 rounded-lg rotate-45 border border-pink-200/20 backdrop-blur-sm animate-spin-slow" />
            <div className="absolute bottom-40 right-[12%] w-24 h-24 rounded-2xl bg-gradient-to-bl from-amber-400/10 to-orange-400/10 backdrop-blur-sm animate-float-slow" />
            <div className="absolute bottom-80 right-[8%] w-14 h-14 rotate-180 border-2 border-purple-200/20 backdrop-blur-sm animate-spin-reverse" />

            {/* 中央装饰 */}
            <div className="absolute top-1/3 left-[20%] w-16 h-16 rounded-lg bg-gradient-to-r from-green-300/10 to-blue-300/10 backdrop-blur-sm animate-float-fast rotate-12" />
            <div className="absolute top-1/4 right-[25%] w-20 h-20 rounded-full border border-indigo-200/20 backdrop-blur-sm animate-pulse-slow" />
            <div className="absolute bottom-1/3 left-[30%] w-12 h-12 rotate-45 border-2 border-rose-200/20 backdrop-blur-sm animate-spin-reverse" />
            <div className="absolute bottom-1/4 right-[28%] w-16 h-16 rounded-xl bg-gradient-to-tr from-violet-400/10 to-fuchsia-400/10 backdrop-blur-sm animate-float-medium" />

            {/* 菱形装饰 */}
            <div className="absolute top-[45%] left-[40%] w-8 h-8 rotate-45 border border-blue-200/20 backdrop-blur-sm animate-spin-slow" />
            <div className="absolute top-[35%] right-[35%] w-10 h-10 rotate-45 border border-purple-200/20 backdrop-blur-sm animate-spin-reverse" />
            
            {/* 三角形装饰 */}
            <div className="absolute top-[25%] left-[45%] w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-b-[25px] border-blue-200/20 animate-float-slow" />
            <div className="absolute bottom-[30%] right-[42%] w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-purple-200/20 animate-float-medium" />

            {/* 光束效果 */}
            <div className="absolute top-0 left-1/4 w-px h-40 bg-gradient-to-b from-transparent via-blue-300/20 to-transparent rotate-45 animate-height-expand" />
            <div className="absolute top-1/4 right-1/3 w-px h-60 bg-gradient-to-b from-transparent via-purple-300/20 to-transparent -rotate-45 animate-height-expand-delay" />
            <div className="absolute bottom-0 left-1/3 w-px h-40 bg-gradient-to-b from-transparent via-pink-300/20 to-transparent rotate-30 animate-height-expand" />
            <div className="absolute top-1/2 right-1/4 w-px h-60 bg-gradient-to-b from-transparent via-indigo-300/20 to-transparent -rotate-30 animate-height-expand-delay" />

            {/* 点状装饰 */}
            <div className="absolute top-[15%] left-[38%] w-2 h-2 rounded-full bg-blue-400/30 animate-pulse-slow" />
            <div className="absolute top-[55%] right-[45%] w-2 h-2 rounded-full bg-purple-400/30 animate-pulse-slow delay-150" />
            <div className="absolute bottom-[25%] left-[42%] w-2 h-2 rounded-full bg-pink-400/30 animate-pulse-slow delay-300" />
            <div className="absolute bottom-[45%] right-[36%] w-2 h-2 rounded-full bg-indigo-400/30 animate-pulse-slow delay-450" />
        </div>

        {/* 全局动画样式 */}
        {/* <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes height-expand {
          0%, 100% { height: 0; opacity: 0; }
          50% { height: 32rem; opacity: 0.3; }
        }
        @keyframes height-expand-delay {
          0%, 100% { height: 0; opacity: 0; }
          50% { height: 40rem; opacity: 0.3; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 10s linear infinite;
        }
        .animate-height-expand {
          animation: height-expand 8s ease-in-out infinite;
        }
        .animate-height-expand-delay {
          animation: height-expand-delay 8s ease-in-out infinite;
          animation-delay: 4s;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .delay-150 {
          animation-delay: 150ms;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
        .delay-450 {
          animation-delay: 450ms;
        }
      `}</style> */}
    </>
    );
}
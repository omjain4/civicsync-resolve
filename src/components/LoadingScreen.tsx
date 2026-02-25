import { useEffect, useState } from "react";

export default function LoadingScreen({ onFinished }: { onFinished: () => void }) {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setFadeOut(true), 1800);
        const finish = setTimeout(() => onFinished(), 2200);
        return () => { clearTimeout(timer); clearTimeout(finish); };
    }, [onFinished]);

    return (
        <div className={`fixed inset-0 z-[9999] bg-[#F3F2EE] flex flex-col items-center justify-center transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            {/* Sweeping character */}
            <div className="relative w-48 h-48 mb-8">
                {/* Floor line */}
                <div className="absolute bottom-4 left-0 right-0 h-[2px] bg-[#1C1C1C]/10" />

                {/* Character body */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sweeper-body">
                    {/* Head */}
                    <div className="w-10 h-10 bg-[#1C1C1C] rounded-full mx-auto relative">
                        {/* Eyes */}
                        <div className="absolute top-3 left-2 w-1.5 h-1.5 bg-white rounded-full" />
                        <div className="absolute top-3 right-2 w-1.5 h-1.5 bg-white rounded-full" />
                        {/* Smile */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-1.5 border-b-2 border-white rounded-b-full" />
                    </div>

                    {/* Torso */}
                    <div className="w-8 h-14 bg-[#D52E25] mx-auto -mt-1 relative">
                        {/* Belt */}
                        <div className="absolute top-8 left-0 right-0 h-1.5 bg-[#1C1C1C]" />
                    </div>

                    {/* Legs */}
                    <div className="flex gap-1 justify-center -mt-0.5">
                        <div className="w-3 h-10 bg-[#1C1C1C] sweeper-leg-left" />
                        <div className="w-3 h-10 bg-[#1C1C1C] sweeper-leg-right" />
                    </div>

                    {/* Broom */}
                    <div className="absolute top-6 -right-14 sweeper-broom origin-top-left">
                        {/* Handle */}
                        <div className="w-1.5 h-20 bg-amber-700 rotate-[30deg] origin-top" />
                        {/* Bristles */}
                        <div className="absolute bottom-[-8px] right-[-12px] rotate-[30deg]">
                            <div className="flex gap-[1px]">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-1 h-5 bg-amber-500 rounded-b-sm sweeper-bristle" style={{ animationDelay: `${i * 0.05}s` }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Arms */}
                    <div className="absolute top-4 -right-4 w-2 h-10 bg-[#D52E25] rotate-[-20deg] origin-top rounded-b sweeper-arm" />
                    <div className="absolute top-4 -left-2 w-2 h-6 bg-[#D52E25] rotate-[15deg] origin-top rounded-b" />
                </div>

                {/* Dust particles */}
                <div className="absolute bottom-6 right-4 sweeper-dust">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-gray-400/50 rounded-full sweeper-particle"
                            style={{
                                left: `${i * 8}px`,
                                bottom: `${Math.random() * 10}px`,
                                animationDelay: `${i * 0.15}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Text */}
            <div className="text-center">
                <h2 className="text-xl font-extrabold uppercase tracking-widest text-[#1C1C1C] mb-2">
                    Civic<span className="text-[#D52E25]">Sync</span>
                </h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">
                    Cleaning up your city...
                </p>
                {/* Progress bar */}
                <div className="mt-4 w-40 h-1 bg-gray-200 mx-auto overflow-hidden">
                    <div className="h-full bg-[#D52E25] sweeper-progress" />
                </div>
            </div>

            <style>{`
        .sweeper-body {
          animation: sweeper-sway 0.8s ease-in-out infinite alternate;
        }
        .sweeper-broom {
          animation: sweeper-sweep 0.6s ease-in-out infinite alternate;
        }
        .sweeper-arm {
          animation: sweeper-arm-move 0.6s ease-in-out infinite alternate;
        }
        .sweeper-leg-left {
          animation: sweeper-walk-left 0.4s ease-in-out infinite alternate;
        }
        .sweeper-leg-right {
          animation: sweeper-walk-right 0.4s ease-in-out infinite alternate;
        }
        .sweeper-bristle {
          animation: sweeper-bristle-wave 0.3s ease-in-out infinite alternate;
        }
        .sweeper-particle {
          animation: sweeper-dust-float 0.8s ease-out infinite;
        }
        .sweeper-progress {
          animation: sweeper-load 2s ease-in-out forwards;
        }

        @keyframes sweeper-sway {
          0% { transform: translateX(-3px); }
          100% { transform: translateX(3px); }
        }
        @keyframes sweeper-sweep {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(10deg); }
        }
        @keyframes sweeper-arm-move {
          0% { transform: rotate(-25deg); }
          100% { transform: rotate(-15deg); }
        }
        @keyframes sweeper-walk-left {
          0% { transform: rotate(5deg); }
          100% { transform: rotate(-5deg); }
        }
        @keyframes sweeper-walk-right {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes sweeper-bristle-wave {
          0% { transform: rotate(-3deg); }
          100% { transform: rotate(3deg); }
        }
        @keyframes sweeper-dust-float {
          0% { opacity: 0.6; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(15px, -15px) scale(0.5); }
        }
        @keyframes sweeper-load {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
        </div>
    );
}

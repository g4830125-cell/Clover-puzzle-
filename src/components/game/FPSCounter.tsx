import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { GameState } from '../../types';

interface FPSCounterProps {
  settings: GameState['settings'];
}

export const FPSCounter: React.FC<FPSCounterProps> = ({ settings }) => {
  const [fps, setFps] = useState<number>(0);
  const [status, setStatus] = useState<'smooth' | 'medium' | 'low'>('smooth');
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const requestRef = useRef<number>(null);

  useEffect(() => {
    if (!settings.showFPS) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      setFps(0);
      return;
    }

    const update = (time: number) => {
      frameCount.current++;
      
      // Update approximately every 500ms for readability while staying real-time
      if (time - lastTime.current >= 500) {
        const calculatedFps = Math.round((frameCount.current * 1000) / (time - lastTime.current));
        setFps(calculatedFps);
        
        if (calculatedFps >= 55) setStatus('smooth');
        else if (calculatedFps >= 30) setStatus('medium');
        else setStatus('low');
        
        frameCount.current = 0;
        lastTime.current = time;
      }
      
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [settings.showFPS]);

  const getStatusColor = () => {
    switch (status) {
      case 'smooth': return 'text-green-400';
      case 'medium': return 'text-arcane-gold';
      case 'low': return 'text-red-400';
      default: return 'text-white/40';
    }
  };

  const getGlowColor = () => {
    switch (status) {
      case 'smooth': return 'shadow-[0_0_10px_rgba(74,222,128,0.2)]';
      case 'medium': return 'shadow-[0_0_10px_rgba(251,191,36,0.2)]';
      case 'low': return 'shadow-[0_0_10px_rgba(248,113,113,0.2)]';
      default: return '';
    }
  };

  if (!settings.showFPS) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-6 right-6 sm:bottom-4 sm:right-4 z-[150] flex items-center gap-2 px-3 py-1.5 bg-[#09090b]/60 backdrop-blur-md border border-white/10 rounded-full pointer-events-none select-none transition-all duration-300 ${getGlowColor()}`}
    >
      <div className={`flex items-center justify-center ${getStatusColor()}`}>
        <Activity size={10} className={status === 'low' ? 'animate-pulse' : ''} />
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className={`text-[11px] font-black font-mono tracking-tighter tabular-nums ${getStatusColor()}`}>
          {fps}
        </span>
        <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">
          FPS
        </span>
      </div>

      {/* Decorative pulse point */}
      <div className="relative flex h-1.5 w-1.5 ml-0.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          status === 'smooth' ? 'bg-green-500' : status === 'medium' ? 'bg-arcane-gold' : 'bg-red-500'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
          status === 'smooth' ? 'bg-green-500' : status === 'medium' ? 'bg-arcane-gold' : 'bg-red-500'
        }`}></span>
      </div>
    </motion.div>
  );
};

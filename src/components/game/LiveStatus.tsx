import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, Radio } from 'lucide-react';

export default function LiveStatus() {
  const [status, setStatus] = useState<'connecting' | 'online'>('connecting');
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Global Activity: High",
    "Rituals in Progress: Many",
    "Selection Ceremony: Active",
    "Clover Network: Stable"
  ];

  useEffect(() => {
    const timer = setTimeout(() => setStatus('online'), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'online') {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % messages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 overflow-hidden h-4">
        <div className="relative">
          {status === 'online' && (
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-green-500 rounded-full"
            />
          )}
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        </div>
        
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5 min-w-[120px]">
          {status === 'connecting' ? (
            <>Connecting...</>
          ) : (
            <>
              <Wifi size={10} className="text-green-500/50" />
              Grimoire Network
            </>
          )}
        </span>
      </div>

      <div className="h-4 flex items-center">
        <AnimatePresence mode="wait">
          {status === 'online' && (
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-[9px] font-bold uppercase tracking-[0.1em] text-arcane-gold/30 flex items-center gap-2"
            >
              <Radio size={8} />
              {messages[messageIndex]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

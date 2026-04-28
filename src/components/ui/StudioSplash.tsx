import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export default function StudioSplash() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#050508] flex items-center justify-center overflow-hidden">
      {/* Background magical pulse */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 1.5] }}
        transition={{ duration: 3, ease: "easeOut" }}
        className="absolute w-[80vw] h-[80vw] bg-arcane-purple/20 blur-[100px] rounded-full"
      />

      <div className="relative flex flex-col items-center scale-[var(--splash-scale)]" style={{ '--splash-scale': 'min(1, calc(100vw / 360))' } as any}>
        {/* The Stylish "Z" Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative group"
        >
          {/* Glowing Aura */}
          <div className="absolute inset-0 bg-arcane-gold/20 blur-xl rounded-full scale-110 animate-pulse" />
          
          <div className="relative w-24 h-24 flex items-center justify-center border-2 border-arcane-gold/40 rounded-2xl bg-black/40 backdrop-blur-sm overflow-hidden">
             {/* Magical Sparkle inside Logo */}
            <motion.div 
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                rotate: 360 
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 flex items-center justify-center text-arcane-gold/10"
            >
              <Sparkles size={80} />
            </motion.div>

            {/* The Z Character */}
            <span className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-arcane-gold via-white to-arcane-gold-dark relative z-10 drop-shadow-[0_0_10px_rgba(243,229,171,0.5)]">
              Z
            </span>

            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-arcane-gold" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-arcane-gold" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-arcane-gold" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-arcane-gold" />
          </div>
        </motion.div>

        {/* Studio Name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-6 flex flex-col items-center"
        >
          <h2 className="text-xl font-display font-medium tracking-[0.3em] uppercase text-arcane-gold">
            Zogratis
          </h2>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-arcane-gold/50 to-transparent my-1" />
          <p className="text-[10px] font-sans font-bold tracking-[0.5em] uppercase text-white/40">
            Studios
          </p>
        </motion.div>

        {/* Loading Bar Decorative */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 140 }}
          transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
          className="absolute -bottom-12 h-[2px] bg-gradient-to-r from-transparent via-arcane-purple to-transparent opacity-50"
        />
      </div>
    </div>
  );
}

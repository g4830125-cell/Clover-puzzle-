/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Sparkles, Skull, Coins, Play } from 'lucide-react';
import CharacterAvatar from './CharacterAvatar';

interface OverlayProps {
  type: 'win' | 'lose' | 'checkpoint' | 'boss';
  title: string;
  message: string;
  reward?: number;
  onAction: () => void;
  actionText: string;
}

const AVATAR_IMG = "https://images.unsplash.com/photo-1541560052-5e137f229371?q=80&w=200&h=200&auto=format&fit=crop"; // Knightly placeholder

export default function Overlay({ type, title, message, reward, onAction, actionText }: OverlayProps) {
  const isWin = type === 'win' || type === 'checkpoint' || type === 'boss';

  const getMentorMessage = () => {
    if (type === 'win') return "Excellent control. The mana follows your will.";
    if (type === 'lose') return "Focus! A magic knight never yields to fatigue.";
    if (type === 'boss') return "This grimoire page is unique. You're growing stronger.";
    return "The ritual is ready.";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#050508]/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-[320px] max-h-[90vh] bg-arcane-frame border border-arcane-purple/30 rounded-[2.5rem] p-6 sm:p-10 text-center shadow-[0_0_80px_rgba(139,92,246,0.15)] relative overflow-y-auto custom-scrollbar flex flex-col items-center"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-arcane-purple/20 blur-3xl rounded-full" />
        
        <div className="mb-6">
          <CharacterAvatar 
             image="https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=200&h=200&auto=format&fit=crop" 
             name="Asta" 
             message={getMentorMessage()} 
             position="left" 
          />
        </div>

        <div className="flex justify-center mb-8 relative z-10">
          {type === 'win' && <Sparkles size={72} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />}
          {type === 'lose' && <Skull size={72} className="text-arcane-red drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />}
          {type === 'boss' && <Sparkles size={72} className="text-arcane-purple animate-pulse drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" />}
        </div>

        <h2 className={`text-2xl font-black mb-3 tracking-tighter font-display relative z-10 ${isWin ? 'text-white' : 'text-arcane-red'}`}>
          {title}
        </h2>
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-10 leading-relaxed font-bold relative z-10">{message}</p>

        {reward && (
          <div className="flex items-center justify-center gap-2 mb-10 bg-black/40 w-fit mx-auto px-6 py-3 rounded-full border border-yellow-500/20 relative z-10">
            <Coins size={22} className="text-yellow-500" />
            <span className="text-2xl font-black text-yellow-500 font-display">+{reward}</span>
          </div>
        )}

        <button
          onClick={onAction}
          className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-display font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 touch-manipulation relative z-10 ${
            isWin 
              ? 'bg-arcane-purple text-white shadow-[0_10px_25px_rgba(139,92,246,0.3)] hover:scale-[1.02]'
              : 'bg-slate-900 border border-white/10 text-arcane-gold-light'
          }`}
        >
          <span className="pointer-events-none">{actionText}</span>
          <Play size={14} className="fill-current pointer-events-none" />
        </button>
      </motion.div>
    </motion.div>
  );
}

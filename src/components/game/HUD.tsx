/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heart, Coins, RotateCcw, Lightbulb, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface HUDProps {
  lives: number;
  gold: number;
  hints: number;
  level: number;
  maxLevel: number;
  onRestart: () => void;
  onHint: () => void;
  onGuidedHint: () => void;
}

export default function HUD({ lives, gold, hints, level, maxLevel, onRestart, onHint, onGuidedHint }: HUDProps) {
  return (
    <div className="w-full max-w-md p-4 flex flex-col gap-4 text-arcane-gold font-sans">
      <div className="flex justify-between items-center bg-gradient-to-b from-[#18181b] to-[#09090b] px-4 py-3 rounded-2xl border border-[#27272a] shadow-inner">
        {/* Lives */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart
              key={i}
              size={14}
              className={`${i < lives ? 'fill-arcane-red text-arcane-red drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-slate-800'}`}
            />
          ))}
        </div>

        {/* Level */}
        <div className="text-center relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-60">
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[7px] font-black uppercase tracking-widest text-green-500">Live</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-arcane-purple font-display font-bold">Stage</div>
          <div className="text-xl font-black text-arcane-gold">{level}</div>
        </div>

        {/* Gold */}
        <div className="flex items-center gap-2">
          <Coins size={18} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          <span className="font-bold tabular-nums text-yellow-500">{gold.toLocaleString()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-8 flex flex-col items-center gap-1.5">
        <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden border border-white/5">
          <motion.div
             initial={{ width: 0 }}
             animate={{ width: `${(level / maxLevel) * 100}%` }}
             className="h-full bg-arcane-purple shadow-[0_0_10px_#8b5cf6]"
          />
        </div>
        <p className="text-[8px] uppercase tracking-widest opacity-40">Ritual Progression</p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-6 mt-2">
        <button
          onClick={onRestart}
          className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-arcane-gold/20 text-arcane-gold/70 hover:text-arcane-gold transition-all"
          title="Restart Ritual"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={onHint}
          className="p-3 bg-arcane-purple/10 hover:bg-arcane-purple/20 rounded-xl border border-arcane-purple/30 text-arcane-purple hover:text-arcane-purple-lighter transition-all flex items-center gap-2"
          title={hints > 0 ? `${hints} Free Hints Available` : "Small Hint (200G)"}
        >
          <Lightbulb size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest px-1 border-l border-arcane-purple/30">
            {hints > 0 ? `${hints}x` : '200G'}
          </span>
        </button>

        <button
          onClick={onGuidedHint}
          className="p-3 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl border border-yellow-500/30 text-yellow-500 hover:text-yellow-400 transition-all flex items-center gap-2"
          title="Full Guided Solution"
        >
          <Zap size={18} />
          <span className="text-[10px] font-bold uppercase tracking-widest px-1 border-l border-yellow-500/30">1000G</span>
        </button>
      </div>
    </div>
  );
}

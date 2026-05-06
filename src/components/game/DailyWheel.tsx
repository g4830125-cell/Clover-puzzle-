/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Coins, Sparkles, X, Gift } from 'lucide-react';
import { soundService } from '../../services/soundService';

interface WheelReward {
  id: number;
  label: string;
  amount: number;
  type: 'gold' | 'hint';
  color: string;
  icon: React.ReactNode;
  weight: number;
}

const REWARDS: WheelReward[] = [
  { id: 0, label: '200 GOLD', amount: 200, type: 'gold', color: '#fbbf24', icon: <Coins size={16} />, weight: 5 },
  { id: 1, label: '150 GOLD', amount: 150, type: 'gold', color: '#f59e0b', icon: <Coins size={16} />, weight: 10 },
  { id: 2, label: '50 GOLD', amount: 50, type: 'gold', color: '#facc15', icon: <Coins size={16} />, weight: 30 },
  { id: 3, label: '25 GOLD', amount: 25, type: 'gold', color: '#fb7185', icon: <Coins size={16} />, weight: 40 },
  { id: 4, label: '15 GOLD', amount: 15, type: 'gold', color: '#a855f7', icon: <Coins size={16} />, weight: 15 },
];

interface DailyWheelProps {
  onClaim: (type: 'gold' | 'hint', amount: number) => void;
  onClose: () => void;
  lastSpin: string | null;
  userEmail?: string;
}

export default function DailyWheel({ onClaim, onClose, lastSpin, userEmail }: DailyWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<WheelReward | null>(null);
  const controls = useAnimation();
  const wheelRef = useRef<HTMLDivElement>(null);

  const isDev = userEmail === 'g4830125@gmail.com' || userEmail === 'dev-test-account';

  const COOLDOWN_MS = 6 * 60 * 60 * 1000;

  const canSpin = () => {
    if (isDev) return true;
    if (!lastSpin) return true;
    const last = new Date(lastSpin).getTime();
    const now = new Date().getTime();
    return now - last >= COOLDOWN_MS;
  };

  const getTimeRemaining = () => {
    if (!lastSpin) return null;
    const last = new Date(lastSpin).getTime();
    const now = new Date().getTime();
    const diff = COOLDOWN_MS - (now - last);
    if (diff <= 0) return null;
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const [timeText, setTimeText] = useState(getTimeRemaining());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeText(getTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSpin]);

  const spin = async () => {
    if (isSpinning || !canSpin()) return;
    
    setIsSpinning(true);
    setReward(null);
    soundService.playMagic();

    // Weighted random selection
    const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedReward = REWARDS[0];
    
    for (const r of REWARDS) {
      if (random < r.weight) {
        selectedReward = r;
        break;
      }
      random -= r.weight;
    }

    const sectionAngle = 360 / REWARDS.length;
    // We want to land selectedReward.id at 0 degrees (top pointer)
    const targetRotation = 360 * 8 + (selectedReward.id * sectionAngle * -1);

    await controls.start({
      rotate: targetRotation,
      transition: { duration: 5, ease: [0.15, 0, 0.05, 1] }
    });

    setReward(selectedReward);
    setIsSpinning(false);
    soundService.playSuccess();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 backdrop-blur-md bg-black/60 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl my-auto"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden rounded-[2.5rem]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-arcane-purple blur-3xl" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors z-20"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6 relative z-10">
          <h3 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-widest mb-1">Spirit Wheel</h3>
          <p className="text-[9px] md:text-[10px] font-bold text-arcane-purple uppercase tracking-[0.3em]">Daily Mana Offering</p>
          {isDev && <span className="inline-block mt-2 px-2 py-0.5 bg-arcane-gold/20 text-arcane-gold text-[8px] font-black uppercase rounded border border-arcane-gold/30">Dev Mode: Always Active</span>}
        </div>

        <div className="relative mb-8 flex justify-center scale-90 md:scale-100">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
             <div className="w-1.5 h-10 bg-white rounded-full shadow-[0_0_15px_white]" />
             <div className="w-6 h-6 bg-white rotate-45 -mt-4 shadow-[0_0_10px_white]" />
          </div>

          {/* SVG Wheel */}
          <motion.div
            ref={wheelRef}
            animate={controls}
            className="w-64 h-64 md:w-72 md:h-72 rounded-full relative"
            style={{ transformOrigin: 'center' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              {REWARDS.map((r, i) => {
                const angle = 360 / REWARDS.length;
                const startAngle = i * angle - 90 - (angle / 2);
                const endAngle = (i + 1) * angle - 90 - (angle / 2);
                
                const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);

                const labelAngle = startAngle + (angle / 2);
                const labelX = 50 + 30 * Math.cos((labelAngle * Math.PI) / 180);
                const labelY = 50 + 30 * Math.sin((labelAngle * Math.PI) / 180);

                return (
                  <g key={r.id}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                      fill={r.color}
                      className="opacity-90 stroke-black/20 stroke-1"
                    />
                    <g transform={`translate(${labelX}, ${labelY}) rotate(${labelAngle + 90})`}>
                       <text
                         fill="black"
                         fontSize="4"
                         fontWeight="900"
                         textAnchor="middle"
                         className="uppercase font-display"
                         y="4"
                       >
                         {r.label}
                       </text>
                    </g>
                  </g>
                );
              })}
            </svg>
            
            {/* Center Hub */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-[#0a0a0c] rounded-full border-4 border-white/10 flex items-center justify-center shadow-2xl z-10">
                <Gift className="text-arcane-gold" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10">
           {reward ? (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-center"
             >
               <div className="flex items-center justify-center gap-3 mb-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                 <div className="p-2 bg-arcane-gold/20 rounded-lg text-arcane-gold">{reward.icon}</div>
                 <div className="text-left">
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Ritual Complete</p>
                   <h4 className="text-base md:text-lg font-display font-black text-white uppercase tracking-wider">{reward.label}</h4>
                 </div>
               </div>
               <button
                 onClick={() => {
                   onClaim(reward.type, reward.amount);
                   onClose();
                 }}
                 className="magic-btn w-full py-4 uppercase font-black tracking-[0.2em]"
               >
                 Claim Reward
               </button>
             </motion.div>
           ) : (
             <div className="text-center">
               <button
                 onClick={spin}
                 disabled={isSpinning || (!canSpin())}
                 className={`magic-btn w-full py-4 text-base md:text-lg transition-all ${(!canSpin() && !isSpinning) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
               >
                 <span className="uppercase tracking-[0.2em] font-black">
                   {isSpinning ? 'Manifesting...' : canSpin() ? 'Commence Ritual' : 'Ritual Exhausted'}
                 </span>
               </button>
               {!canSpin() && (
                 <motion.div 
                   initial={{ opacity: 0 }} 
                   animate={{ opacity: 1 }}
                   className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5"
                 >
                   <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Next Ritual Available In</p>
                   <span className="text-lg md:text-xl font-display font-black text-arcane-purple tracking-widest">{timeText}</span>
                 </motion.div>
               )}
             </div>
           )}
        </div>
      </motion.div>
    </motion.div>
  );
}

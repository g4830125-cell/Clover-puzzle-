import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, Sword, Shield, Loader2, X, Trophy, Coins } from 'lucide-react';
import { multiplayerService } from '../../services/multiplayerService';
import { MultiplayerMode } from '../../types';
import { soundService } from '../../services/soundService';

interface MultiplayerLobbyProps {
  userId: string;
  userName: string;
  onMatchFound: (matchData: any) => void;
  onBack: () => void;
}

export default function MultiplayerLobby({ userId, userName, onMatchFound, onBack }: MultiplayerLobbyProps) {
  const [queueingType, setQueueingType] = useState<MultiplayerMode | null>(null);

  useEffect(() => {
    multiplayerService.connect();
    
    const unsubscribe = multiplayerService.on('match_found', (data) => {
      soundService.playMagic();
      onMatchFound(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleJoinQueue = (type: MultiplayerMode) => {
    soundService.playClick();
    setQueueingType(type);
    multiplayerService.joinQueue(type, userId, userName);
  };

  const handleCancelQueue = () => {
    soundService.playClick();
    if (queueingType) {
      multiplayerService.leaveQueue(queueingType);
      setQueueingType(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex items-center justify-between sticky top-0 bg-[#050508]/80 backdrop-blur-md z-10 py-2">
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors p-2 -ml-2">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-[0.2em]">Clover Arena</h2>
          <p className="text-[10px] font-bold text-arcane-purple uppercase tracking-widest">Real-time multiplayer</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pb-12">
        {/* 1v1 Mode */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 relative overflow-hidden group min-h-[320px]"
        >
          <div className="absolute top-0 right-0 p-4">
            <User size={24} className="text-arcane-purple/30" />
          </div>
          
          <div className="w-20 h-20 bg-arcane-purple/20 rounded-full flex items-center justify-center border border-arcane-purple/40">
            <Sword size={32} className="text-arcane-purple" />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">Arcane Dual</h3>
            <p className="text-xs text-white/40 mt-2">1 vs 1 Competitive Battle</p>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1.5 text-arcane-gold">
              <Coins size={12} /> 200 Reward
            </div>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <div className="text-white/20">10s Time Limit</div>
          </div>

          <button
            disabled={!!queueingType}
            onClick={() => handleJoinQueue('1v1')}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-display font-bold text-sm uppercase tracking-widest hover:bg-arcane-purple hover:border-arcane-purple transition-all mt-auto"
          >
            Enter Queue
          </button>
        </motion.div>

        {/* 2v2 Mode */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-6 relative overflow-hidden group min-h-[320px]"
        >
          <div className="absolute top-0 right-0 p-4">
            <Users size={24} className="text-[#10b981]/30" />
          </div>

          <div className="w-20 h-20 bg-[#10b981]/20 rounded-full flex items-center justify-center border border-[#10b981]/40">
            <Shield size={32} className="text-[#10b981]" />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">Alliance Rite</h3>
            <p className="text-xs text-white/40 mt-2">2 vs 2 Team Collaboration</p>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1.5 text-arcane-gold">
              <Coins size={12} /> 150 Reward
            </div>
            <div className="w-1 h-1 bg-white/10 rounded-full" />
            <div className="text-white/20">15s Team Goal</div>
          </div>

          <button
            disabled={!!queueingType}
            onClick={() => handleJoinQueue('2v2')}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-display font-bold text-sm uppercase tracking-widest hover:bg-[#10b981] hover:border-[#10b981] transition-all mt-auto"
          >
            Enter Queue
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {queueingType && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <div className="bg-[#0a0a0c] border border-arcane-purple/30 rounded-[3rem] p-12 text-center flex flex-col items-center gap-6 max-w-sm w-full">
              <div className="relative">
                <Loader2 size={48} className="text-arcane-purple animate-spin" />
                <Users size={24} className="absolute inset-0 m-auto text-white" />
              </div>
              
              <div>
                <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Ritual Pending...</h2>
                <p className="text-xs text-white/40 mt-2 uppercase font-bold tracking-tighter">
                  Summoning {queueingType === '1v1' ? 'an opponent' : 'allies and rivals'}
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Searching Clover Network</span>
              </div>

              <button
                onClick={handleCancelQueue}
                className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors mt-4"
              >
                Withdraw Request
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, Sword, Shield, Loader2, X, Trophy, Coins, Copy, Check, Zap, PlayCircle } from 'lucide-react';
import { multiplayerService } from '../../services/multiplayerService';
import { MultiplayerMode, MultiplayerPlayer } from '../../types';
import { soundService } from '../../services/soundService';

interface RoomRitualProps {
  userId: string;
  roomCode: string;
  roomId: string;
  mode: MultiplayerMode;
  players: MultiplayerPlayer[];
  isDeveloper?: boolean;
  botTestMode?: boolean;
  onLeave: () => void;
  onMatchFound: (data: any) => void;
}

export default function RoomRitual({ 
  userId, 
  roomCode, 
  roomId, 
  mode, 
  players: initialPlayers, 
  isDeveloper,
  botTestMode,
  onLeave, 
  onMatchFound 
}: RoomRitualProps) {
  const [players, setPlayers] = useState<MultiplayerPlayer[]>(initialPlayers);
  const [copied, setCopied] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const isHost = players[0]?.userId === userId;
  const maxPlayers = mode === '1v1' ? 2 : 4;
  const isFull = players.length === maxPlayers;

  useEffect(() => {
    const unsubUpdated = multiplayerService.on('ritual_updated', (data) => {
      setPlayers(data.players);
    });

    const unsubMatch = multiplayerService.on('match_found', (data) => {
      soundService.playMagic();
      onMatchFound(data);
    });

    return () => {
      unsubUpdated();
      unsubMatch();
    };
  }, [onMatchFound]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    soundService.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartMatch = () => {
    if (!isHost) return;
    soundService.playClick();
    multiplayerService.startRitual(roomId);
  };

  const handleLeave = () => {
    multiplayerService.leaveRitual(roomId);
    onLeave();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between sticky top-0 bg-[#050508]/80 backdrop-blur-md z-10 py-4 px-2 shrink-0">
        <button 
          onClick={handleLeave} 
          className="text-white/40 hover:text-white transition-all p-3 -ml-2 active:scale-90 touch-manipulation flex items-center justify-center"
          aria-label="Leave Ritual"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-[0.2em]">Ritual Lounge</h2>
          <p className="text-[10px] font-bold text-arcane-gold uppercase tracking-widest leading-none">{mode === '1v1' ? 'Arcane Dual' : 'Alliance Rite'} Setup</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="flex flex-col items-center gap-6 sm:gap-8 py-4 px-1">
          {/* Room Code Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/[0.02] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 w-full max-w-sm flex flex-col items-center gap-3 sm:gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-arcane-gold/40 to-transparent" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Incantation Seal</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl sm:text-4xl font-display font-black text-white tracking-[0.3em] sm:tracking-[0.5em]">{roomCode}</span>
              <button 
                onClick={copyCode}
                className="p-2.5 sm:p-3 bg-white/5 rounded-xl sm:rounded-2xl hover:bg-white/10 transition-colors group"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-arcane-gold group-hover:scale-110 transition-transform" />}
              </button>
            </div>
            <p className="text-[8px] sm:text-[9px] font-bold text-white/20 uppercase tracking-widest text-center">Share this code with your allies or rivals to begin the ritual</p>
          </motion.div>

          {/* Players List */}
          <div className="w-full flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                <Users size={14} className="text-arcane-purple" />
                Manifested Souls ({players.length}/{maxPlayers})
              </h3>
              <div className="flex items-center gap-2">
                {isFull && <span className="text-[9px] font-black bg-green-500/20 text-green-500 px-2 py-1 rounded-md uppercase tracking-widest">Complete</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence mode="popLayout">
                {players.map((p, idx) => (
                  <motion.div
                    key={p.userId || p.socketId}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg font-black ${
                        p.team === 'A' ? 'bg-arcane-purple/20 text-arcane-purple' : 'bg-arcane-gold/20 text-arcane-gold'
                      }`}>
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          {p.name}
                          {idx === 0 && <Zap size={10} className="text-arcane-gold fill-arcane-gold" />}
                        </div>
                        <div className="text-[8px] sm:text-[10px] text-white/40 uppercase font-black tracking-widest">
                          Team {p.team} • {p.userId === userId ? 'You' : 'Summoned'}
                        </div>
                      </div>
                    </div>
                    
                    {idx === 0 && (
                      <span className="text-[7px] sm:text-[8px] font-black bg-arcane-gold/10 text-arcane-gold border border-arcane-gold/20 px-2 py-0.5 rounded-full uppercase tracking-tighter">Initiator</span>
                    )}
                  </motion.div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="border border-dashed border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-center py-5 sm:py-6">
                    <div className="flex flex-col items-center gap-1 opacity-20">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Waiting for soul...</span>
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button Area - Sticky at bottom */}
      <div className="w-full pt-4 pb-6 px-1 shrink-0 bg-gradient-to-t from-[#050508] via-[#050508] to-transparent">
        {isHost ? (
          <button
            onClick={handleStartMatch}
            className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-2xl font-display font-black text-xs sm:text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 active:scale-95 touch-manipulation ${
              isFull 
              ? 'bg-arcane-gold text-black shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:scale-[1.01]' 
              : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
            }`}
          >
            <PlayCircle size={18} className="pointer-events-none" />
            <span className="pointer-events-none">Commence Ritual</span>
          </button>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
              Awaiting the Initiator to begin...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

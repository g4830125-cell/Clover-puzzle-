import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, User, Sword, Shield, Loader2, X, Trophy, Coins, Zap, Hash, ArrowRight } from 'lucide-react';
import { multiplayerService } from '../../services/multiplayerService';
import { MultiplayerMode } from '../../types';
import { soundService } from '../../services/soundService';
import RoomRitual from './RoomRitual';

interface MultiplayerLobbyProps {
  userId: string;
  userName: string;
  userEmail?: string;
  onMatchFound: (matchData: any) => void;
  onBack: () => void;
}

export default function MultiplayerLobby({ userId, userName, userEmail, onMatchFound, onBack }: MultiplayerLobbyProps) {
  const [queueingType, setQueueingType] = useState<MultiplayerMode | null>(null);
  const [activeRitual, setActiveRitual] = useState<any>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botTestMode, setBotTestMode] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  const isDeveloper = userEmail === 'g4830125@gmail.com';

  useEffect(() => {
    const socket = multiplayerService.getSocket();
    if (!socket?.connected) {
      multiplayerService.connect();
    }
    
    const unsubMatch = multiplayerService.on('match_found', (data) => {
      soundService.playMagic();
      onMatchFound(data);
    });

    const unsubCreated = multiplayerService.on('ritual_created', (data) => {
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
        createTimeoutRef.current = null;
      }
      setActiveRitual(data);
      setIsCreating(false);
    });

    const unsubJoined = multiplayerService.on('ritual_joined', (data) => {
      setActiveRitual(data);
      setIsJoining(false);
    });

    const unsubError = multiplayerService.on('ritual_error', (data) => {
      setError(data.message);
      setIsJoining(false);
      if (createTimeoutRef.current) {
        clearTimeout(createTimeoutRef.current);
        createTimeoutRef.current = null;
      }
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      setTimeout(() => setError(null), 3000);
    });

    const unsubReconnected = multiplayerService.on('reconnected', (data) => {
      if (data.status === 'waiting') {
        setActiveRitual({
          roomId: data.roomId,
          roomCode: data.roomCode,
          mode: data.type,
          players: data.players
        });
      } else {
        // Already in progress, App.tsx should handle this via matchFound typically
        // But let's trigger found here for safety
        onMatchFound(data);
      }
    });

    return () => {
      unsubMatch();
      unsubCreated();
      unsubJoined();
      unsubError();
      unsubReconnected();
    };
  }, [onMatchFound]);

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

  const createTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleCreateRitual = (mode: MultiplayerMode) => {
    const socket = multiplayerService.getSocket();
    if (!socket?.connected) {
      setError("Connection to the ManaGrid plane lost. Reconnecting...");
      multiplayerService.connect();
      setTimeout(() => setError(null), 3000);
      return;
    }

    soundService.playClick();
    setIsCreating(true);
    setError(null);

    if (createTimeoutRef.current) clearTimeout(createTimeoutRef.current);

    createTimeoutRef.current = setTimeout(() => {
      setIsCreating(prev => {
        if (prev) {
          setError("Mana flow interrupted. Could not initiate ritual.");
          return false;
        }
        return false;
      });
    }, 10000);

    multiplayerService.createRitual(mode);
  };

  const joinTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleJoinRitual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    const socket = multiplayerService.getSocket();
    if (!socket?.connected) {
      setError("Connection lost. Trying to reconnect...");
      multiplayerService.connect();
      setTimeout(() => setError(null), 3000);
      return;
    }

    soundService.playClick();
    setIsJoining(true);
    setError(null);
    
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    
    // Safety timeout for APK/Mobile where socket callback might hang
    joinTimeoutRef.current = setTimeout(() => {
      setIsJoining(prev => {
        if (prev) {
          setError("Connection failure. The ritual remains silent.");
          return false;
        }
        return prev;
      });
    }, 10000);

    multiplayerService.joinRitual(roomCodeInput.trim().toUpperCase());
  };

  useEffect(() => {
    if (activeRitual && joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
  }, [activeRitual]);

  useEffect(() => {
    return () => {
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeRitual) {
      setIsJoining(false);
    }
  }, [activeRitual]);

  if (activeRitual) {
    return (
      <RoomRitual 
        userId={userId}
        roomId={activeRitual.roomId}
        roomCode={activeRitual.roomCode}
        mode={activeRitual.mode}
        players={activeRitual.players}
        isDeveloper={isDeveloper}
        botTestMode={botTestMode}
        onLeave={() => {
          soundService.playClick();
          setActiveRitual(null);
          onBack();
        }}
        onMatchFound={onMatchFound}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between sticky top-0 bg-[#050508]/80 backdrop-blur-md z-10 py-4 px-2 shrink-0">
        <button onClick={onBack} className="text-white/40 hover:text-white transition-all p-3 -ml-2 active:scale-90 touch-manipulation">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-[0.2em]">Mana Arena</h2>
          <p className="text-[10px] font-bold text-arcane-purple uppercase tracking-widest leading-none">Real-time multiplayer</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
        <div className="flex flex-col gap-8 sm:gap-12 mt-4">
          {/* Matchmaking Section */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-6 px-1">
              <Zap size={18} className="text-arcane-gold" />
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/60">Quick Matchmaking</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* 1v1 Mode */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-3 sm:gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-30">
                  <User size={20} className="text-arcane-purple" />
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-arcane-purple/20 rounded-full flex items-center justify-center border border-arcane-purple/40">
                  <Sword size={20} className="sm:size-24 text-arcane-purple" />
                </div>
                <div className="text-center">
                  <h3 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-widest leading-tight">ManaGrid Duel</h3>
                  <p className="text-[8px] sm:text-[9px] text-white/40 mt-1 uppercase tracking-widest">1 VS 1 Competitive</p>
                </div>
                <button
                  disabled={!!queueingType}
                  onClick={() => handleJoinQueue('1v1')}
                  className="w-full py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-arcane-purple hover:border-arcane-purple transition-all active:scale-95 touch-manipulation"
                >
                  Enter Queue
                </button>
              </motion.div>

              {/* 2v2 Mode */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-3 sm:gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-30 pointer-events-none">
                  <Users size={20} className="text-[#10b981]" />
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#10b981]/20 rounded-full flex items-center justify-center border border-[#10b981]/40 pointer-events-none">
                  <Shield size={20} className="sm:size-24 text-[#10b981]" />
                </div>
                <div className="text-center pointer-events-none">
                  <h3 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-widest leading-tight">Alliance Rite</h3>
                  <p className="text-[8px] sm:text-[9px] text-white/40 mt-1 uppercase tracking-widest">2 VS 2 Collaboration</p>
                </div>
                <button
                  disabled={!!queueingType}
                  onClick={() => handleJoinQueue('2v2')}
                  className="w-full py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-[#10b981] hover:border-[#10b981] transition-all active:scale-95 touch-manipulation"
                >
                  Enter Queue
                </button>
              </motion.div>
            </div>
          </section>

          {/* Private Rituals Section */}
          <section>
            <div className="flex items-center gap-3 mb-4 sm:mb-6 px-1">
              <Hash size={18} className="text-arcane-purple" />
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-white/60">Private Rituals</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Join by Code */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-arcane-gold mb-3 sm:mb-4">Enter Invitation Seal</h4>
                <form onSubmit={handleJoinRitual} className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="EX: A7K9F"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={5}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-white font-display font-bold text-sm sm:text-base tracking-[0.2em] sm:tracking-[0.3em] uppercase placeholder:text-white/10 focus:outline-none focus:border-arcane-gold/40 transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={isJoining || roomCodeInput.length < 5}
                    className="p-3 sm:p-4 bg-arcane-gold text-black rounded-lg sm:rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isJoining ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  </button>
                </form>
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[8px] sm:text-[9px] font-bold text-red-500 uppercase tracking-widest mt-2"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Create Ritual */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-arcane-purple">Initiate New Ritual</h4>
                <div className="flex gap-2">
                  <button 
                    disabled={isJoining || isCreating}
                    onClick={() => handleCreateRitual('1v1')}
                    className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 touch-manipulation disabled:opacity-50 flex items-center justify-center"
                  >
                    {isCreating ? <Loader2 size={12} className="animate-spin" /> : 'Create 1V1'}
                  </button>
                  <button 
                    disabled={isJoining || isCreating}
                    onClick={() => handleCreateRitual('2v2')}
                    className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 touch-manipulation disabled:opacity-50 flex items-center justify-center"
                  >
                    {isCreating ? <Loader2 size={12} className="animate-spin" /> : 'Create 2V2'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
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
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Searching Mana Network</span>
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

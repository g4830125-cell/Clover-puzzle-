/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { ALL_LEVELS } from './lib/levels';
import PuzzleBoard from './components/game/PuzzleBoard';
import HUD from './components/game/HUD';
import Overlay from './components/game/Overlay';
import DailyWheel from './components/game/DailyWheel';
import { RECOVERY_COST } from './constants';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, Trophy, Home, Heart, Coins, Plus, ChevronRight, User, Users, Gift, Settings } from 'lucide-react';
import { soundService } from './services/soundService';
import StudioSplash from './components/ui/StudioSplash';
import LiveStatus from './components/game/LiveStatus';
import { getApiUrl } from './lib/api';

import Leaderboard from './components/game/Leaderboard';
import NameEntry from './components/game/NameEntry';
import MultiplayerLobby from './components/game/MultiplayerLobby';
import MultiplayerGame from './components/game/MultiplayerGame';
import { socialService } from './services/socialService';
import FriendsOverlay from './components/social/FriendsOverlay';
import InviteNotification from './components/social/InviteNotification';
import { multiplayerService } from './services/multiplayerService';
import { GameInvite } from './types';
import { FPSCounter } from './components/game/FPSCounter';
import { PingIndicator } from './components/game/PingIndicator';
import { SettingsModal } from './components/game/SettingsModal';

export default function App() {
  const { state, updateLevel, addGold, addHint, useLife, recoverLife, claimDailyReward, claimWheelReward, claimLaunchReward, setState } = useGameState();
  const [view, setView] = useState<'menu' | 'playing' | 'shop' | 'achievements' | 'leaderboard' | 'multiplayer_lobby' | 'multiplayer_game'>('menu');
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState<GameInvite | null>(null);
  const [multiplayerData, setMultiplayerData] = useState<any>(null);
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [showGuidedSolution, setShowGuidedSolution] = useState(false);
  const [overlay, setOverlay] = useState<'win' | 'lose' | 'boss' | 'launch' | null>(null);
  const [isSplashing, setIsSplashing] = useState(true);
  const [isNamingOpen, setIsNamingOpen] = useState(false);

  const HINT_COST = 200;
  const GUIDED_HINT_COST = 1000;

  const images = {
    mentor: '/magic_knight_mentor.png',
    kingdom: '/arcane_kingdom_bg.png',
    library: '/wizard_tower_library.png'
  };

  const useHint = () => {
    if (state.hints > 0 && !showHints) {
      setState(prev => ({ ...prev, hints: prev.hints - 1 }));
      setShowHints(true);
      soundService.playMagic();
      setTimeout(() => setShowHints(false), 5000);
    } else if (state.gold >= HINT_COST && !showHints) {
      addGold(-HINT_COST);
      setShowHints(true);
      soundService.playCoin();
      // Auto-hide hint after 5 seconds to keep some challenge
      setTimeout(() => setShowHints(false), 5000);
    }
  };

  const useGuidedHint = () => {
    if (state.gold >= GUIDED_HINT_COST && !showGuidedSolution) {
      addGold(-GUIDED_HINT_COST);
      setShowGuidedSolution(true);
      soundService.playMagic();
      // Solution stays visible until win or restart
    }
  };

  const checkLaunchReward = useCallback(() => {
    if (!state.hasClaimedLaunchReward) {
      setOverlay('launch');
    }
  }, [state.hasClaimedLaunchReward]);

  const claimLaunchGift = () => {
    claimLaunchReward();
    soundService.playWin();
    setOverlay(null);
  };

  const checkDailyReward = useCallback(() => {
    const today = new Date().toDateString();
    if (state.lastDailyReward !== today) {
      claimDailyReward(50);
      soundService.playCoin();
    }
  }, [state.lastDailyReward, claimDailyReward]);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsSplashing(false);
    }, 3200);

    // Initialize multiplayer and social socket
    multiplayerService.connect();
    const socket = multiplayerService.getSocket();
    
    const handleInit = () => {
      if (state.userId) {
        socialService.init(socket!, state.userId, state.name || 'Mage', state.email);
      }
    };

    if (socket) {
      if (socket.connected) {
        handleInit();
      } else {
        socket.once('connect', handleInit);
      }
    }

    const unsubMatch = multiplayerService.on('match_found', (data) => {
      setMultiplayerData(data);
      setView('multiplayer_game');
      setIsSocialOpen(false); // Close social hub
      setActiveInvite(null); // Clear any pending invite
      socialService.refreshSocialData();
    });

    const unsubInvite = multiplayerService.on('game_invite_received', (invite: GameInvite) => {
      setActiveInvite(invite);
      soundService.playMagic();
    });

    const unsubAccepted = multiplayerService.on('invite_accepted', (data) => {
      setActiveInvite(null);
      // Actual matchFound will follow
    });

    const unsubReconnected = multiplayerService.on('reconnected', (data) => {
      if (data.status === 'waiting') {
        setView('multiplayer_lobby');
      } else {
        setMultiplayerData(data);
        setView('multiplayer_game');
      }
    });

    return () => {
      clearTimeout(splashTimer);
      unsubMatch();
      unsubInvite();
      unsubAccepted();
      unsubReconnected();
    };
  }, [state.userId, state.name]);

  useEffect(() => {
    if (!isSplashing) {
      checkDailyReward();
      checkLaunchReward();
      syncProgress(state.currentLevel);
      if (!state.name) {
        setIsNamingOpen(true);
      }
    }
    // Try to play BGM on first interaction
    const enableAudio = () => {
      soundService.setEnabled(state.settings.isSoundEnabled);
      soundService.startBGM();
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);
    return () => window.removeEventListener('click', enableAudio);
  }, [checkDailyReward, isSplashing]);

  const currentLevelData = useMemo(() => {
    return ALL_LEVELS.find(l => l.id === state.currentLevel) || ALL_LEVELS[0];
  }, [state.currentLevel]);

  const syncProgress = useCallback(async (level: number) => {
    try {
      const response = await fetch(getApiUrl('/api/leaderboard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.userId || 'guest-' + Math.random().toString(36).substr(2, 9),
          name: state.name || 'Anonymous Mage',
          level: level,
          isTest: state.userId === 'dev-test-account' || state.userId === 'g4830125@gmail.com'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
    } catch (e) {
      console.error('Failed to sync progress:', e);
    }
  }, [state.userId, state.name]);

  const handleWin = useCallback(() => {
    soundService.playWin();
    setShowHints(false);
    setShowGuidedSolution(false);
    
    syncProgress(state.currentLevel); // Sync current completed level
    
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#3b82f6', '#fbbf24']
    });

    if (currentLevelData.isBoss) {
      setOverlay('boss');
    } else {
      setOverlay('win');
    }
  }, [currentLevelData, state.currentLevel, syncProgress]);

  const handleFail = useCallback(() => {
    soundService.playFail();
    useLife();
    setShowHints(false);
    setShowGuidedSolution(false);
    // If this was the last life (it will be 0 after useLife), show the overlay
    if (state.lives <= 1) {
      setOverlay('lose');
    }
  }, [useLife, state.lives]);

  const nextLevel = () => {
    soundService.playCoin();
    addGold(currentLevelData.reward);
    updateLevel(1);
    setOverlay(null);
    setPuzzleKey(k => k + 1);
    setShowHints(false);
  };

  const restartLevel = useCallback(() => {
    soundService.playPlace();
    setOverlay(null);
    setShowHints(false);
    setShowGuidedSolution(false);
    if (state.lives > 0) {
      setPuzzleKey(k => k + 1);
    } else {
      setView('shop');
    }
  }, [state.lives]);

  const buyLife = () => {
    if (recoverLife(RECOVERY_COST)) {
      soundService.playCoin();
    }
  };

  const handleNameComplete = (name: string) => {
    setState((prev: any) => ({ ...prev, name }));
    setIsNamingOpen(false);
    
    // Explicitly sync with the new name to avoid state batching delay
    fetch(getApiUrl('/api/leaderboard'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.userId,
        name: name,
        level: state.currentLevel,
        isTest: state.userId === 'g4830125@gmail.com'
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error('Leaderboard name sync failed:', res.status, text);
      }
    })
    .catch(err => console.error('Leaderboard name sync network error:', err));
  };

  return (
    <div className="min-h-screen h-[100dvh] bg-[#050508] text-arcane-gold flex items-center justify-center font-sans p-0 sm:p-2 overflow-hidden">
      <AnimatePresence>
        {isSplashing && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100]"
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <StudioSplash />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] bg-arcane-purple/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-blue-900/10 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Main Scaling Container */}
      <div 
        className="relative flex items-center justify-center w-full h-full sm:h-[min(740px,95vh)] sm:max-w-[360px] origin-center sm:scale-[var(--app-scale)] gpu-accelerated" 
        style={{ '--app-scale': 'min(1, min(calc((100vh - 40px) / 740), calc((100vw - 20px) / 360)))' } as any}
      >
        {/* Mobile Frame Container */}
        <div className="mobile-frame relative w-full h-full sm:border-[4px] border-[#1c1917] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
          {/* Mana Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="mana-particle gpu-accelerated"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${2 + Math.random() * 4}px`,
                  height: `${2 + Math.random() * 4}px`,
                  '--tw-translate-x': `${(Math.random() - 0.5) * 100}px`,
                  '--tw-translate-y': `${-100 - Math.random() * 100}px`,
                  animationDelay: `${i * 2}s`
                } as any}
              />
            ))}
          </div>
        {state.currentLevel % 10 === 0 && (
          <div className="absolute top-[30px] right-[-30px] bg-arcane-red text-white py-1.5 px-10 rotate-45 font-display font-black tracking-widest text-[10px] z-20 shadow-lg">
            BOSS
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-6 pt-10 relative overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group backdrop-blur-md transform-gpu"
                  aria-label="Settings"
                >
                  <Settings className="text-white/60 group-hover:text-white transition-colors" size={18} />
                </motion.button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-12 text-center py-4">
                <div className="flex items-center justify-center gap-4">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsNamingOpen(true)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group transform-gpu"
                    aria-label="Profile"
                  >
                    <User className="text-white/60 group-hover:text-white transition-colors" size={20} />
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSocialOpen(true)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group relative transform-gpu"
                    aria-label="Social"
                  >
                    <Users className="text-white/60 group-hover:text-white transition-colors" size={20} />
                  </motion.button>
                </div>
                <div className="relative shrink-0">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-10 bg-gradient-to-tr from-arcane-purple to-transparent opacity-10 blur-2xl"
                  />
                  <h1 
                    className="text-4xl font-black tracking-tighter uppercase leading-none drop-shadow-[0_0_15px_rgba(139,92,246,0.3)] font-display text-white transition-transform active:scale-95"
                  >
                    Mana<br/>
                    <span className="text-arcane-purple">Grid</span>
                  </h1>
                  <div className="text-arcane-gold/40 font-display text-[10px] mt-4 tracking-[0.4em] uppercase font-bold">ManaGrid Selection</div>
                </div>

                <div className="my-2">
                  <LiveStatus />
                </div>

                <div className="flex flex-col gap-4 w-full shrink-0">
                    <button
                      onClick={() => {
                        if (state.lives > 0) {
                          soundService.playPlace();
                          setView('playing');
                        } else {
                          setView('shop');
                        }
                      }}
                      className="magic-btn w-full py-5 text-lg transition-all active:scale-95 touch-manipulation transform-gpu"
                    >
                      <motion.span 
                        whileTap={{ scale: 0.98 }}
                        className="relative uppercase tracking-widest pointer-events-none block"
                      >
                        {state.lives > 0 ? 'Start Selection' : 'No Mana - Visit Vault'}
                      </motion.span>
                    </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setView('multiplayer_lobby')}
                      className="col-span-2 p-5 rounded-2xl bg-arcane-purple/20 border border-arcane-purple/30 hover:bg-arcane-purple hover:border-arcane-purple transition-all flex items-center justify-center gap-3 group active:scale-95 touch-manipulation transform-gpu"
                    >
                      <Users className="text-arcane-purple group-hover:text-white transition-colors pointer-events-none" size={24} />
                      <span className="text-xs font-display font-black uppercase tracking-[0.2em] text-white group-hover:scale-105 transition-transform pointer-events-none">Arena Battle</span>
                    </button>
                    <button
                      onClick={() => setIsWheelOpen(true)}
                      className="col-span-2 p-5 rounded-2xl bg-gradient-to-tr from-arcane-gold/20 to-transparent border border-arcane-gold/30 hover:from-arcane-gold hover:to-arcane-gold transition-all flex items-center justify-center gap-3 group active:scale-95 touch-manipulation transform-gpu"
                    >
                      <Gift className="text-arcane-gold group-hover:text-slate-950 transition-colors pointer-events-none" size={24} />
                      <span className="text-xs font-display font-black uppercase tracking-[0.2em] text-white group-hover:text-slate-950 group-hover:scale-105 transition-transform pointer-events-none">Daily Ritual</span>
                    </button>
                    <button
                      onClick={() => setView('shop')}
                      className="p-4 rounded-2xl bg-black/40 border border-[#27272a] hover:border-arcane-purple/40 transition-all active:scale-95 touch-manipulation flex flex-col items-center gap-2 group transform-gpu"
                    >
                      <ShoppingBag className="text-arcane-purple group-hover:text-arcane-gold transition-colors pointer-events-none" size={20} />
                      <span className="text-[8px] font-display font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 text-center pointer-events-none">Vault</span>
                    </button>
                    <button
                      onClick={() => setView('leaderboard')}
                      className="p-4 rounded-2xl bg-black/40 border border-[#27272a] hover:border-arcane-purple/40 transition-all active:scale-95 touch-manipulation flex flex-col items-center gap-2 group transform-gpu"
                    >
                      <Trophy className="text-arcane-purple group-hover:text-arcane-gold transition-colors pointer-events-none" size={20} />
                      <span className="text-[8px] font-display font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 text-center pointer-events-none">Ranks</span>
                    </button>
                    <button
                      onClick={() => setView('achievements')}
                      className="p-4 rounded-2xl bg-black/40 border border-[#27272a] hover:border-arcane-purple/40 transition-all active:scale-95 touch-manipulation flex flex-col items-center gap-2 group transform-gpu"
                    >
                      <Plus className="text-arcane-purple group-hover:text-arcane-gold transition-colors pointer-events-none" size={20} />
                      <span className="text-[8px] font-display font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 text-center pointer-events-none">Feats</span>
                    </button>
                    <button
                      onClick={() => setIsNamingOpen(true)}
                      className="p-4 rounded-2xl bg-black/40 border border-[#27272a] hover:border-arcane-purple/40 transition-all active:scale-95 touch-manipulation flex flex-col items-center gap-2 group transform-gpu"
                    >
                      <User className="text-arcane-purple group-hover:text-arcane-gold transition-colors pointer-events-none" size={20} />
                      <span className="text-[8px] font-display font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 text-center pointer-events-none">Profile</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <HUD
                lives={state.lives}
                gold={state.gold}
                hints={state.hints}
                level={state.currentLevel}
                maxLevel={100}
                onRestart={restartLevel}
                onHint={useHint} 
                onGuidedHint={useGuidedHint}
              />

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-2 flex flex-col items-center custom-scrollbar">
                <div className="text-center mb-4 shrink-0">
                  <h3 className="text-base font-display font-black text-arcane-purple tracking-widest uppercase mb-1">{currentLevelData.title}</h3>
                  <div className="w-10 h-0.5 bg-arcane-purple/30 mx-auto" />
                </div>

                <div className="w-full max-w-[340px] px-2 mx-auto aspect-square shrink-0">
                  <PuzzleBoard
                    key={`${state.currentLevel}-${puzzleKey}`}
                    level={currentLevelData}
                    onWin={handleWin}
                    onFail={handleFail}
                    showHints={showHints}
                    showGuidedSolution={showGuidedSolution}
                  />
                </div>
                
                <button
                   onClick={() => setView('menu')}
                   className="mt-8 mb-4 flex items-center gap-2 text-slate-600 hover:text-arcane-gold transition-colors uppercase text-[10px] font-bold tracking-[0.3em] shrink-0"
                >
                  <Home size={14} /> Back to Library
                </button>
              </div>
            </motion.div>
          )}

          {view === 'shop' && (
             <motion.div
              key="shop"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center p-8 text-center overflow-y-auto custom-scrollbar"
            >
              <div className="mt-8 mb-10 shrink-0 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/30 rounded-3xl flex items-center justify-center shadow-lg">
                  <ShoppingBag size={40} className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
                </div>
                <h2 className="text-2xl font-display font-black text-white">ManaGrid Vault</h2>
                <div className="w-12 h-1 bg-yellow-500/40 rounded-full" />
              </div>

              <div className="w-full space-y-4 shrink-0">
                <div className="bg-black/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-yellow-500/20 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-red-500/10 rounded-2xl group-hover:bg-red-500/20 transition-colors">
                       <Heart className="text-red-500" size={20} />
                     </div>
                     <div className="text-left">
                       <div className="font-bold text-sm">Heart Core</div>
                       <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Restore Essence</div>
                     </div>
                  </div>
                  <button
                    onClick={buyLife}
                    disabled={state.gold < RECOVERY_COST || state.lives >= 5}
                    className="px-5 py-2 bg-yellow-500 text-slate-950 font-black rounded-xl disabled:opacity-20 transition-all active:scale-95 text-xs font-display"
                  >
                    {RECOVERY_COST}G
                  </button>
                </div>
              </div>

              <div className="my-8 flex flex-col items-center gap-2 shrink-0">
                 <span className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold">Vault Balance</span>
                 <span className="text-4xl font-black text-yellow-500 flex items-center gap-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                   <Coins size={28} /> {state.gold}
                 </span>
              </div>

              <button
                 onClick={() => setView('menu')}
                 className="mt-auto mb-4 w-full py-4 bg-slate-900 rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-colors border border-white/5 shrink-0"
              >
                Exit Vault
              </button>
            </motion.div>
          )}

          {view === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col p-8 overflow-hidden"
            >
               <div className="mt-4 mb-4 shrink-0 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-arcane-purple/10 border border-arcane-purple/30 rounded-3xl flex items-center justify-center">
                  <Trophy size={32} className="text-arcane-purple" />
                </div>
                <h2 className="text-2xl font-display font-black text-white">Hall of Fate</h2>
                <div className="w-8 h-1 bg-arcane-purple/30 rounded-full" />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar content-visibility-auto">
                {state.achievements.map((a) => (
                  <div key={a.id} className={`p-4 rounded-2xl border transition-all ${a.isUnlocked ? 'bg-arcane-purple/10 border-arcane-purple/40' : 'bg-black/40 border-white/5 opacity-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${a.isUnlocked ? 'bg-arcane-purple text-white shadow-[0_0_15px_#8b5cf6]' : 'bg-slate-900 text-slate-700'}`}>
                        <Trophy size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center justify-between">
                          {a.title}
                          {a.isUnlocked && <Sparkles size={12} className="text-yellow-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter mt-0.5">{a.description}</div>
                      </div>
                    </div>
                    {!a.isUnlocked && (
                      <div className="mt-3 w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-arcane-purple transition-all shadow-[0_0_8px_#8b5cf6]"
                          style={{ width: `${Math.min(100, (a.currentValue / a.requirement) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                 onClick={() => setView('menu')}
                 className="mt-6 w-full py-4 bg-slate-900 rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-colors border border-white/5"
              >
                Close Library
              </button>
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-hidden">
                <Leaderboard />
              </div>
              <div className="p-6 bg-[#0a0a0c] shrink-0 border-t border-white/5">
                <button
                   onClick={() => setView('menu')}
                   className="w-full py-4 bg-slate-900 rounded-2xl font-display font-bold uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-colors border border-white/5 shadow-xl"
                >
                  Return to Gates
                </button>
              </div>
            </motion.div>
          )}

          {view === 'multiplayer_lobby' && (
            <motion.div
              key="multiplayer_lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col overflow-hidden px-4 py-2"
            >
              <MultiplayerLobby 
                userId={state.userId || 'guest'}
                userName={state.name || 'Mage'}
                userEmail={state.email}
                onBack={() => setView('menu')}
                onMatchFound={(data) => {
                  setMultiplayerData(data);
                  setView('multiplayer_game');
                }}
              />
            </motion.div>
          )}

          {view === 'multiplayer_game' && multiplayerData && (
            <motion.div
              key="multiplayer_game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden px-4 py-2"
            >
              <MultiplayerGame 
                roomId={multiplayerData.roomId}
                mode={multiplayerData.type}
                players={multiplayerData.players}
                puzzleShapes={multiplayerData.puzzleShapes}
                userId={state.userId || 'guest'}
                onFinish={(gold) => {
                  if (gold > 0) addGold(gold);
                  setView('menu');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <NameEntry 
          isOpen={isNamingOpen}
          initialValue={state.name || ''}
          isChanging={!!state.name}
          onComplete={handleNameComplete}
          onCancel={state.name ? () => setIsNamingOpen(false) : undefined}
        />

        <AnimatePresence>
          {isWheelOpen && (
            <DailyWheel 
              lastSpin={state.lastWheelSpin}
              onClaim={claimWheelReward}
              onClose={() => setIsWheelOpen(false)}
              userEmail={state.userId}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSocialOpen && (
            <FriendsOverlay 
              onClose={() => setIsSocialOpen(false)}
              userId={state.userId || 'guest'}
              userEmail={state.email}
            />
          )}
        </AnimatePresence>

        <InviteNotification 
          invite={activeInvite}
          onAccept={() => {
            if (activeInvite) {
              socialService.acceptGameInvite(activeInvite);
              setActiveInvite(null);
            }
          }}
          onDecline={() => setActiveInvite(null)}
        />
      </div>
    </div>

      {/* Decorative desktop elements */}
      <div className="absolute left-[calc(50%+220px)] top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none">
        <h2 className="text-2xl font-display font-bold mb-4 opacity-80">Rune Mastery</h2>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl border border-arcane-purple/30 flex items-center justify-center text-arcane-purple bg-arcane-purple/5">★</div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-arcane-purple">Daily Ritual</div>
              <div className="text-xs opacity-60">Collect +50 Mana Gold</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl border border-arcane-red/30 flex items-center justify-center text-arcane-red bg-arcane-red/5">❦</div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-arcane-red">Vital Essence</div>
              <div className="text-xs opacity-60">{state.lives}/3 Souls Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Overlays */}
      <AnimatePresence>
        {overlay === 'launch' && (
          <Overlay
            type="boss"
            title="Premium Gift"
            message="Welcome to ManaGrid! Since you're one of our first players, here is a special gift!"
            reward={1000}
            actionText="Claim Gift"
            onAction={claimLaunchGift}
          />
        )}
        {overlay === 'win' && (
          <Overlay
            type="win"
            title="ManaGrid Success!"
            message="You have successfully bound the mana flow."
            reward={currentLevelData.reward}
            actionText="Next Level"
            onAction={nextLevel}
          />
        )}
        {overlay === 'boss' && (
          <Overlay
            type="boss"
            title="Guardian Defeated"
            message="A major seal has been broken. Your mana pool expands."
            reward={currentLevelData.reward}
            actionText="Continue Saga"
            onAction={nextLevel}
          />
        )}
        {overlay === 'lose' && (
          <Overlay
            type="lose"
            title="Essence Faded"
            message="The runes rejected your attempt. A piece of your soul vanished."
            actionText="Retry Ritual"
            onAction={restartLevel}
          />
        )}
      </AnimatePresence>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        state={state} 
        setState={setState} 
      />

      <FPSCounter settings={state.settings} />
      <PingIndicator settings={state.settings} />
    </div>
  );
}

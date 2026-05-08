import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { multiplayerService } from '../../services/multiplayerService';
import { SHAPES } from '../../constants';
import { MultiplayerPlayer, MultiplayerMode } from '../../types';
import { soundService } from '../../services/soundService';
import { Timer, Trophy, Heart, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MultiplayerGameProps {
  roomId: string;
  mode: MultiplayerMode;
  players: MultiplayerPlayer[];
  puzzleShapes: string[];
  userId: string;
  onFinish: (goldReward: number) => void;
}

// Memoized player row for performance in list rendering
const PlayerResultRow = memo(({ player, isSelf }: { player: MultiplayerPlayer; isSelf: boolean }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl gpu-accelerated">
    <div className="flex items-center gap-3">
       <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isSelf ? 'border-arcane-purple bg-arcane-purple/20' : 'border-white/10'}`}>
         <span className="text-[10px] font-black uppercase text-white">{player.name[0]}</span>
       </div>
       <div className="flex flex-col">
         <span className="text-xs font-bold text-white tracking-widest uppercase">{player.name} {player.isBot ? '(CPU)' : ''}</span>
         {player.team && (
           <span className={`text-[8px] font-black uppercase ${player.team === 'A' ? 'text-[#8b5cf6]' : 'text-[#10b981]'}`}>
             Team {player.team}
           </span>
         )}
       </div>
    </div>
    <div className="flex flex-col items-end">
       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Score</span>
       <span className="text-sm font-display font-bold text-white">{player.score}</span>
    </div>
  </div>
));
PlayerResultRow.displayName = 'PlayerResultRow';

export default function MultiplayerGame({ roomId, mode, players, puzzleShapes, userId, onFinish }: MultiplayerGameProps) {
  const [status, setStatus] = useState<'countdown' | 'playing' | 'round_results' | 'results'>('countdown');
  const [roundResults, setRoundResults] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<{A: number, B: number}>({A: 0, B: 0});
  const [currentRound, setCurrentRound] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(mode === '1v1' ? 30 : 60);
  const [localChances, setLocalChances] = useState(3);
  const [allPlayers, setAllPlayers] = useState<MultiplayerPlayer[]>(players.map(p => ({ ...p, score: 0, chances: 3 })));
  const [results, setResults] = useState<any>(null);
  const [currentPuzzleShapes, setCurrentPuzzleShapes] = useState<string[]>(puzzleShapes);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);

  const myPlayer = allPlayers.find(p => p.socketId === multiplayerService.id);
  const currentShapeId = currentPuzzleShapes[currentShapeIndex];
  const currentShape = useMemo(() => currentShapeId ? SHAPES[currentShapeId] : null, [currentShapeId]);

  const shapeOptions = useMemo(() => {
    if (!currentShapeId) return [];
    return SHAPE_IDS_FOR_OPTIONS(currentShapeId);
  }, [currentShapeId]);

  useEffect(() => {
    const handlers = {
      game_start: ({ timeLeft }: { timeLeft: number }) => {
        setStatus('playing');
        setTimeLeft(timeLeft);
      },
      round_start: ({ round, timeLeft, puzzleShapes: newShapes, players: newPlayers }: any) => {
        setStatus('playing');
        setTimeLeft(timeLeft);
        setCurrentRound(round);
        setCurrentPuzzleShapes(newShapes);
        setCurrentShapeIndex(0);
        setAllPlayers(prev => prev.map(p => {
          const match = newPlayers.find((np: any) => np.socketId === p.socketId);
          return match ? { ...p, score: match.score, chances: match.chances } : p;
        }));
        setLocalChances(3);
      },
      timer_tick: ({ timeLeft }: { timeLeft: number }) => {
        setTimeLeft(timeLeft);
      },
      player_scored: ({ socketId, score }: { socketId: string; score: number }) => {
        setAllPlayers(prev => prev.map(p => p.socketId === socketId ? { ...p, score } : p));
      },
      player_lost_chance: ({ socketId, chances }: { socketId: string; chances: number }) => {
        setAllPlayers(prev => prev.map(p => p.socketId === socketId ? { ...p, chances } : p));
        if (socketId === multiplayerService.id) setLocalChances(chances);
      },
      round_results: (data: any) => {
        setRoundResults(data);
        setTeamStats(data.teamStats);
        setStatus('round_results');
        soundService.playMagic();
      },
      game_results: (data: any) => {
        setResults(data);
        if (data.teamStats) setTeamStats(data.teamStats);
        setStatus('results');
        
        const isWinner = mode === '1v1' 
          ? data.winner === multiplayerService.id 
          : data.winnerTeam === myPlayer?.team;

        if (isWinner && data.winner !== 'draw' && data.winnerTeam !== 'draw') {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          soundService.playWin();
        } else {
          isWinner || data.winner === 'draw' ? soundService.playMagic() : soundService.playLose();
        }
      }
    };

    const unsubs = Object.entries(handlers).map(([event, handler]) => 
      multiplayerService.on(event, handler)
    );

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      unsubs.forEach(unsub => unsub());
    };
  }, [mode, myPlayer?.team]);

  const handleGuess = useCallback((shapeId: string) => {
    if (status !== 'playing' || localChances <= 0) return;
    
    // Prevent guessing if already finished all shapes
    if (currentShapeIndex >= currentPuzzleShapes.length) return;

    const isCorrect = shapeId === currentPuzzleShapes[currentShapeIndex];
    multiplayerService.submitGuess(roomId, shapeId, isCorrect);

    if (isCorrect) {
      soundService.playSuccess();
      if (currentShapeIndex < currentPuzzleShapes.length - 1) {
        setCurrentShapeIndex(prev => prev + 1);
      } else {
        // Move to final 'completed' index
        setCurrentShapeIndex(currentPuzzleShapes.length);
      }
    } else {
      soundService.playError();
    }
  }, [status, localChances, currentPuzzleShapes, currentShapeIndex, roomId]);

  const teamAScore = useMemo(() => {
    return allPlayers.filter(p => p.team === 'A').reduce((acc, p) => acc + (p.score || 0), 0);
  }, [allPlayers]);

  const teamBScore = useMemo(() => {
    return allPlayers.filter(p => p.team === 'B').reduce((acc, p) => acc + (p.score || 0), 0);
  }, [allPlayers]);

  const getTeamProgress = useCallback((team: 'A' | 'B') => {
    const score = team === 'A' ? teamAScore : teamBScore;
    return Math.min(100, (score / 4) * 100);
  }, [teamAScore, teamBScore]);

  if (status === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center gap-8 h-full gpu-accelerated">
        <div className="text-center">
          <h2 className="text-4xl font-display font-black text-white uppercase tracking-[0.4em]">Ritual Starts</h2>
          <p className="text-xs text-white/40 mt-2 uppercase font-bold tracking-widest">Construct your aura</p>
        </div>
        
        <motion.div
          key={countdown}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-display font-black text-arcane-purple"
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {countdown}
        </motion.div>

        <div className="flex gap-4">
          {players.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full border-2 ${p.team === 'A' ? 'border-[#8b5cf6]' : 'border-[#10b981]'} flex items-center justify-center bg-black/40`}>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">{p.name[0]}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-white/40">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'round_results') {
    const isRoundWinner = roundResults.roundWinner === myPlayer?.team;
    
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-8 h-full gpu-accelerated"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            <Trophy size={80} className={`${isRoundWinner ? 'text-arcane-gold' : 'text-white/20'} mx-auto mb-4`} />
          </motion.div>
          
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-[0.3em]">
            {roundResults.roundWinner === 'draw' ? 'Round Draw' : (isRoundWinner ? 'Round Won' : 'Round Lost')}
          </h2>
          <p className="text-xs text-arcane-purple mt-2 uppercase font-bold tracking-widest">
            Prepare for Round {roundResults.nextRound}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-widest">Alliance A</span>
            <div className="flex gap-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className={`w-8 h-2 rounded-full ${i < teamStats.A ? 'bg-[#8b5cf6]' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest">Alliance B</span>
            <div className="flex gap-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className={`w-8 h-2 rounded-full ${i < teamStats.B ? 'bg-[#10b981]' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>

        <motion.div 
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-[10px] text-white/40 uppercase font-black tracking-[0.5em] mt-8"
        >
          Next Round Loading...
        </motion.div>
      </motion.div>
    );
  }

  if (status === 'results') {
    const isWinner = mode === '1v1' 
      ? results.winner === multiplayerService.id 
      : results.winnerTeam === myPlayer?.team;
    
    const isDraw = mode === '1v1' ? results.winner === 'draw' : results.winnerTeam === 'draw';
    const goldReward = isWinner && !isDraw ? (mode === '1v1' ? 200 : 150) : 0;

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-6 h-full overflow-y-auto px-4 py-8 custom-scrollbar gpu-accelerated"
      >
        <div className="text-center flex-shrink-0">
          <Trophy size={64} className={`${isWinner && !isDraw ? 'text-arcane-gold' : 'text-white/20'} mx-auto mb-4`} />
          <h2 className="text-3xl font-display font-black text-white uppercase tracking-widest leading-none">
            {isDraw ? 'Inconclusive' : (isWinner ? 'Victorious' : 'Vanquished')}
          </h2>
          <p className="text-[10px] text-white/40 mt-2 uppercase font-bold tracking-widest">
            The mana has settled
          </p>
        </div>

        {mode === '2v2' && (
          <div className="flex gap-4 mb-4">
            <div className={`p-2 rounded-lg border ${results.winnerTeam === 'A' ? 'border-[#8b5cf6] bg-[#8b5cf6]/10' : 'border-white/10'}`}>
              <div className="text-[8px] font-black uppercase text-white/40 mb-1">Alliance A</div>
              <div className="flex gap-1 justify-center">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className={`w-4 h-1 rounded-full ${i < teamStats.A ? 'bg-[#8b5cf6]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
            <div className={`p-2 rounded-lg border ${results.winnerTeam === 'B' ? 'border-[#10b981] bg-[#10b981]/10' : 'border-white/10'}`}>
              <div className="text-[8px] font-black uppercase text-white/40 mb-1">Alliance B</div>
              <div className="flex gap-1 justify-center">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className={`w-4 h-1 rounded-full ${i < teamStats.B ? 'bg-[#10b981]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>
        )}

        {goldReward > 0 && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-arcane-gold/10 border border-arcane-gold/30 px-8 py-4 rounded-3xl flex items-center gap-3 flex-shrink-0"
          >
            <Zap className="text-arcane-gold animate-pulse" />
            <span className="text-xl font-display font-black text-arcane-gold">+{goldReward} GOLD</span>
          </motion.div>
        )}

        <div className="flex flex-col w-full max-w-sm gap-2">
          {allPlayers.map((p, i) => (
            <PlayerResultRow key={i} player={p} isSelf={p.socketId === multiplayerService.id} />
          ))}
        </div>

        <button
          onClick={() => {
            soundService.playClick();
            onFinish(goldReward);
          }}
          className="w-full max-w-[240px] py-4 bg-white font-display font-black text-xs text-black uppercase tracking-[0.2em] rounded-2xl hover:bg-arcane-gold transition-all mt-4 flex-shrink-0 shadow-xl"
        >
          Return to Menu
        </button>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
      <div className="flex items-center justify-between sticky top-0 bg-[#050508]/80 backdrop-blur-md z-10 py-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 px-4 py-3 rounded-2xl">
            <Timer className="text-arcane-gold animate-pulse" size={20} />
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Time Remaining</span>
                <span className={`text-xl font-display font-black ${timeLeft <= 3 ? 'text-red-500 animate-bounce' : 'text-white'}`}>
                  {timeLeft}s
                </span>
            </div>
          </div>
          {mode === '2v2' && (
            <div className="flex gap-3 mt-1 px-2">
              <div className="flex gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className={`w-4 h-1 rounded-full ${i < teamStats.A ? 'bg-[#8b5cf6]' : 'bg-white/10'}`} />
                ))}
              </div>
              <div className="flex gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className={`w-4 h-1 rounded-full ${i < teamStats.B ? 'bg-[#10b981]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col">
             <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Soul Fragments</span>
             <div className="flex gap-1 mt-1">
               {[...Array(3)].map((_, i) => (
                 <div 
                   key={i}
                   className={`w-4 h-4 rounded-full transition-all duration-300 ${i < localChances ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-white/10'}`}
                 >
                   <Heart size={8} className="text-white m-auto" />
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-around gap-8 py-4 gpu-accelerated">
        <div className="text-center">
           <h3 className="text-xl font-display font-black text-white uppercase tracking-[0.2em]">
             {mode === '1v1' ? `ManaGrid Duel ${Math.min(currentShapeIndex + 1, 15)}/15` : `Round ${currentRound}: Alliance Rite ${currentShapeIndex + 1}/4`}
           </h3>
           <p className="text-[10px] font-bold text-arcane-purple uppercase tracking-widest mt-1">Identify and tap the matching mana</p>
        </div>

        {currentShapeIndex >= currentPuzzleShapes.length ? (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex flex-col items-center justify-center p-12 bg-arcane-purple/10 border border-arcane-purple/40 rounded-3xl w-full aspect-square gpu-accelerated"
           >
             <Trophy size={64} className="text-arcane-gold mb-4 animate-bounce" />
             <h4 className="text-2xl font-display font-black text-white uppercase tracking-widest text-center">Trial Complete!</h4>
             <p className="text-xs text-arcane-purple font-black uppercase tracking-widest mt-2">Waiting for other seekers...</p>
           </motion.div>
        ) : (
          <>
            <div className="w-56 h-56 relative bg-white/5 rounded-full p-8 border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.1)] flex-shrink-0">
               {currentShape ? (
                 <svg viewBox={currentShape.viewBox} className="w-full h-full drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                   <path d={currentShape.path} fill={currentShape.color} className="animate-pulse" />
                 </svg>
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                   <div className="w-12 h-12 border-4 border-arcane-purple/20 border-t-arcane-purple rounded-full animate-spin" />
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full px-2 max-w-sm">
               {shapeOptions.map(id => {
                 const shape = SHAPES[id];
                 if (!shape) return null;
                 return (
                   <motion.button
                     key={id}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => handleGuess(id)}
                     disabled={localChances <= 0}
                     className="aspect-square bg-black/40 border border-white/10 rounded-2xl hover:border-arcane-purple/50 transition-all flex items-center justify-center group p-6 gpu-accelerated"
                   >
                     <svg viewBox={shape.viewBox} className="w-full h-full group-hover:scale-110 transition-transform duration-300">
                       <path d={shape.path} fill="white" className="opacity-20 group-hover:opacity-60 transition-opacity duration-300" />
                     </svg>
                   </motion.button>
                 );
               })}
            </div>
          </>
        )}
      </div>

      {mode === '2v2' && (
        <div className="grid grid-cols-2 gap-6 p-4 bg-white/5 rounded-3xl border border-white/10 flex-shrink-0">
           <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-[#8b5cf6] uppercase tracking-widest">Order of Light</span>
                <span className="text-[9px] font-black text-white/40">{Math.round(getTeamProgress('A'))}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${getTeamProgress('A')}%` }}
                  className="h-full bg-gradient-to-r from-[#8b5cf6] to-white"
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
           </div>
           <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest">Emerald Guard</span>
                <span className="text-[9px] font-black text-white/40">{Math.round(getTeamProgress('B'))}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${getTeamProgress('B')}%` }}
                  className="h-full bg-gradient-to-r from-[#10b981] to-white"
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
           </div>
        </div>
      )}

      {mode === '1v1' && (
        <div className="flex justify-center flex-shrink-0">
          <div className="flex items-center gap-6 px-6 py-3 bg-white/5 rounded-full border border-white/10">
             {allPlayers.map((p, i) => (
               <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase">{p.name}</span>
                  <span className="text-xs font-display font-black text-white">{p.score}</span>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SHAPE_IDS_FOR_OPTIONS(correctId: string) {
  if (!correctId) return [];
  const all = Object.keys(SHAPES);
  const others = all.filter(id => id !== correctId);
  const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
  const options = [correctId, ...shuffledOthers.slice(0, 3)];
  return options.sort(() => 0.5 - Math.random());
}

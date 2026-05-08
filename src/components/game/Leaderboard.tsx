import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, User, Loader2, RefreshCw } from 'lucide-react';

import { LeaderboardEntry } from '../../types';
import { getApiUrl } from '../../lib/api';

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/leaderboard'));
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError('Could not reach the Clover Network');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#050508]">
      <div className="p-6 shrink-0 border-b border-white/5 bg-[#0a0a0c]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-arcane-purple/10 rounded-xl flex items-center justify-center border border-arcane-purple/30">
              <Trophy size={20} className="text-arcane-purple" />
            </div>
            <div>
              <h2 className="text-sm font-display font-black text-white uppercase tracking-widest leading-none">Global Rankings</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-green-500/70">Real Activity Only</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={fetchLeaderboard}
            className="p-3 transition-all hover:bg-white/10 rounded-xl active:scale-90 text-slate-500 hover:text-white touch-manipulation flex items-center justify-center shrink-0 border border-transparent hover:border-white/5"
            disabled={loading}
          >
            <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''} pointer-events-none`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 content-visibility-auto">
        {loading && data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
            <Loader2 className="animate-spin" size={32} />
            <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Syncing Grimoire...</span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
             <div className="text-red-500/50 uppercase text-[10px] font-bold tracking-widest">{error}</div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((entry, index) => {
              const rank = index + 1;
              const isTest = entry.name.includes('(Test Player)');
              
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    delay: Math.min(index * 0.03, 0.5), 
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all transform-gpu ${
                    isTest 
                      ? 'bg-blue-500/5 border-blue-500/20' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 flex items-center justify-center">
                      {rank === 1 ? <Medal className="text-yellow-500" size={20} /> :
                       rank === 2 ? <Medal className="text-slate-400" size={20} /> :
                       rank === 3 ? <Medal className="text-amber-700" size={20} /> :
                       <span className="text-xs font-black text-white/20 tabular-nums">#{rank}</span>}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        isTest ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/5 bg-black/40'
                      }`}>
                         <User size={14} className={isTest ? 'text-blue-400' : 'text-slate-500'} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isTest ? 'text-blue-400' : 'text-white'}`}>
                          {entry.name}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">
                          Verified Achievement
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Stage</span>
                      <span className="text-lg font-black text-arcane-gold tabular-nums">{entry.level}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {data.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No rankings recorded yet</p>
                <p className="text-[9px] text-slate-700 mt-1 uppercase">Complete a level to appear here</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-6 shrink-0 border-t border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md">
        <p className="text-[8px] text-center text-slate-600 uppercase tracking-[0.25em] leading-relaxed">
          The Clover Network ensures all data is strictly verified through real gameplay progression. No simulations allowed.
        </p>
      </div>
    </div>
  );
}

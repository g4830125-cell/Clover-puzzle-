import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Activity, Wifi, Volume2, VolumeX } from 'lucide-react';
import { GameState } from '../../types';
import { soundService } from '../../services/soundService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, state, setState }) => {
  const toggleFPS = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        showFPS: !prev.settings.showFPS
      }
    }));
  };

  const togglePing = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        showPing: !prev.settings.showPing
      }
    }));
  };

  const toggleSound = () => {
    const newEnabled = !state.settings.isSoundEnabled;
    soundService.setEnabled(newEnabled);
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        isSoundEnabled: newEnabled
      }
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-arcane-purple/20 rounded-lg text-arcane-purple">
                  <Settings size={18} />
                </div>
                <div>
                  <h2 className="text-xs font-display font-black text-white uppercase tracking-widest text-left">Arcane Settings</h2>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest text-left mt-0.5">Configure your grimoire</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-white/20 hover:text-white transition-colors"
                aria-label="Close Settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <h3 className="text-[9px] font-black text-arcane-gold uppercase tracking-[0.2em] mb-2 text-left">Audio Control</h3>
                
                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-lg transition-colors ${state.settings.isSoundEnabled ? 'bg-arcane-purple/20 text-arcane-purple' : 'bg-white/5 text-white/20'}`}>
                      {state.settings.isSoundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white uppercase tracking-widest">Master Volume</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Toggle all arcane sounds</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${state.settings.isSoundEnabled ? 'bg-arcane-purple' : 'bg-white/10'}`}>
                    <motion.div 
                      animate={{ x: state.settings.isSoundEnabled ? 16 : 0 }}
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-[9px] font-black text-arcane-gold uppercase tracking-[0.2em] mb-2 text-left">Relics & Visions</h3>
                
                {/* FPS Toggle */}
                <button
                  onClick={toggleFPS}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-lg transition-colors ${state.settings.showFPS ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'}`}>
                      <Activity size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white uppercase tracking-widest">FPS Sight</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Real-time performance</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${state.settings.showFPS ? 'bg-arcane-purple' : 'bg-white/10'}`}>
                    <motion.div 
                      animate={{ x: state.settings.showFPS ? 16 : 0 }}
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </button>

                {/* Ping Toggle */}
                <button
                  onClick={togglePing}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`p-2 rounded-lg transition-colors ${state.settings.showPing ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                      <Wifi size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white uppercase tracking-widest">Latency Pulse</p>
                      <p className="text-[8px] text-white/40 uppercase tracking-widest mt-0.5">Network resonance (ms)</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${state.settings.showPing ? 'bg-arcane-purple' : 'bg-white/10'}`}>
                    <motion.div 
                      animate={{ x: state.settings.showPing ? 16 : 0 }}
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-white/5">
                <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] text-center italic">
                  Manifestations persist in the local grimoire
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-white/5 border-t border-white/5">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-arcane-purple text-white rounded-xl font-display font-black text-[9px] uppercase tracking-[0.3em] shadow-lg shadow-arcane-purple/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Seal Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

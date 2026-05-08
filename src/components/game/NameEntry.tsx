import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, User, AlertCircle } from 'lucide-react';
import { soundService } from '../../services/soundService';

interface NameEntryProps {
  isOpen: boolean;
  onComplete: (name: string) => void;
  onCancel?: () => void;
  initialValue?: string;
  isChanging?: boolean;
}

const FORBIDDEN_WORDS = [
  'badword1', 'badword2', 'offensive', 'spam', 'hack', 'admin', 'moderator', 'system'
  // In a real app, this would be a much more comprehensive list or linked to an API.
];

export default function NameEntry({ isOpen, onComplete, onCancel, initialValue = '', isChanging = false }: NameEntryProps) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    
    if (trimmedName.length > 15) {
      setError('Name must be under 15 characters');
      return;
    }

    const containsForbidden = FORBIDDEN_WORDS.some(word => 
      trimmedName.toLowerCase().includes(word.toLowerCase())
    );

    if (containsForbidden) {
      setError('This name is not allowed in the Kingdom');
      return;
    }

    soundService.playMagic();
    onComplete(trimmedName);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-sm bg-[#0a0a0c] border border-arcane-purple/30 rounded-[2.5rem] p-8 relative overflow-hidden"
          >
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-arcane-purple/20 blur-[100px] rounded-full" />
            
            {isChanging && onCancel && (
              <button 
                onClick={onCancel}
                className="absolute top-6 right-6 text-white/20 hover:text-white"
              >
                <X size={20} />
              </button>
            )}

            <div className="flex flex-col items-center gap-6 relative">
              <div className="w-16 h-16 bg-arcane-purple/10 rounded-2xl flex items-center justify-center border border-arcane-purple/30">
                <User size={32} className="text-arcane-purple" />
              </div>

              <div className="text-center">
                <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">
                  {isChanging ? 'Transmute Identity' : 'Rite of Naming'}
                </h2>
                <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-tighter">
                  Choose your mage signature
                </p>
              </div>

              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter Name..."
                    className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-4 text-center text-white placeholder:text-white/10 focus:outline-none focus:border-arcane-purple/50 transition-all font-display font-bold text-lg uppercase tracking-widest`}
                  />
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 text-red-500"
                    >
                      <AlertCircle size={10} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{error}</span>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-5 bg-arcane-purple rounded-xl font-display font-bold text-sm uppercase tracking-[0.2em] hover:bg-arcane-purple-lighter transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] mt-2"
                >
                  Confirm Ritual
                </button>
              </form>

              <div className="flex items-center gap-2 mt-2">
                <Sparkles size={12} className="text-arcane-gold/40" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#4ade80]/50">Verified in Mana Network</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

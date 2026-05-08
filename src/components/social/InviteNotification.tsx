import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, X, Check, Users } from 'lucide-react';
import { GameInvite } from '../../types';

interface InviteNotificationProps {
  invite: GameInvite | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function InviteNotification({ invite, onAccept, onDecline }: InviteNotificationProps) {
  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed top-6 right-6 z-[200] w-72 bg-[#121216] border border-arcane-purple/30 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-arcane-purple shadow-[2px_0_10px_rgba(139,92,246,0.3)]" />
          
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-arcane-purple/20 rounded-lg text-arcane-purple">
                <Sword size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-arcane-purple uppercase tracking-widest leading-none mb-1">Combat Invitation</h4>
                <p className="text-xs font-bold text-white uppercase tracking-wider">{invite.fromName}</p>
              </div>
              <button 
                onClick={onDecline}
                className="p-3 text-slate-500 hover:text-white transition-all active:scale-90 touch-manipulation"
              >
                <X size={16} className="pointer-events-none" />
              </button>
            </div>
            
            <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-4">
              Challenges you to a <span className="text-white">{invite.mode}</span> battle
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onDecline}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 touch-manipulation"
              >
                Ignore
              </button>
              <button
                onClick={onAccept}
                className="py-2.5 rounded-xl bg-arcane-purple text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-arcane-purple/20 hover:scale-[1.03] active:scale-95 transition-all touch-manipulation"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { motion } from 'motion/react';

interface CharacterAvatarProps {
  image: string;
  name: string;
  message?: string;
  position?: 'left' | 'right';
}

function CharacterAvatarComponent({ image, name, message, position = 'left' }: CharacterAvatarProps) {
  return (
    <div className={`flex items-end gap-3 ${position === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-16 h-16 rounded-2xl border-2 border-arcane-gold overflow-hidden bg-black/40 shadow-[0_0_15px_rgba(243,229,171,0.3)]"
      >
        <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </motion.div>
      
      {message && (
        <motion.div
          initial={{ opacity: 0, x: position === 'left' ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl max-w-[200px]"
        >
          <div className="text-[9px] uppercase font-display font-bold text-arcane-purple mb-1">{name}</div>
          <div className="text-[11px] text-arcane-gold/90 italic leading-tight">"{message}"</div>
          
          {/* Bubble Tail */}
          <div className={`absolute bottom-3 ${position === 'left' ? '-left-1' : '-right-1'} w-2 h-2 bg-black/60 border-b border-l border-white/10 rotate-45`} />
        </motion.div>
      )}
    </div>
  );
}

export default memo(CharacterAvatarComponent);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import { Shape } from '../../types';

interface PuzzlePieceProps {
  shape: Shape;
  onPlace: (x: number, y: number) => void;
  initialX: number;
  initialY: number;
  size: number;
  rotation?: number;
}

function PuzzlePieceComponent({ shape, onPlace, initialX, initialY, size, rotation = 0 }: PuzzlePieceProps) {
  if (!shape) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        onPlace(info.point.x, info.point.y);
      }}
      initial={{ x: initialX, y: initialY, scale: 0, rotate: rotation }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05, cursor: 'grab' }}
      whileTap={{ scale: 0.95, cursor: 'grabbing' }}
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      layoutId={`piece-${shape.id}`}
      className="absolute z-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-xl border-2 border-arcane-gold shadow-[0_4px_15px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(255,255,255,0.2)] p-2 touch-none transform-gpu select-none"
      style={{ 
        width: size, 
        height: size, 
        willChange: 'transform',
        touchAction: 'none'
      }}
    >
      <svg
        viewBox={shape.viewBox}
        className="w-full h-full drop-shadow-[0_0_5px_rgba(243,229,171,0.5)] pointer-events-none"
      >
        <path
          d={shape.path}
          fill="rgba(243, 229, 171, 0.4)"
          stroke="#f3e5ab"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}

export default memo(PuzzlePieceComponent);

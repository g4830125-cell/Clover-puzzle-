/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Level } from '../../types';
import { SHAPES } from '../../constants';
import PuzzlePiece from './PuzzlePiece';
import { motion, AnimatePresence } from 'motion/react';

interface PuzzleBoardProps {
  key?: string | number;
  level: Level;
  onWin: () => void;
  onFail: () => void;
  showHints?: boolean;
  showGuidedSolution?: boolean;
}

import { soundService } from '../../services/soundService';

export default function PuzzleBoard({ level, onWin, onFail, showHints, showGuidedSolution }: PuzzleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placedIndices, setPlacedIndices] = useState<Set<number>>(new Set());
  const [pieces, setPieces] = useState<{ id: number; shapeId: string; x: number; y: number }[]>([]);
  
  // Initialize pieces in random positions at the bottom/side
  useEffect(() => {
    const newPieces = level.shapes.map((s, idx) => ({
      id: idx,
      shapeId: s.shapeId,
      // Percentage-based random positions in the rack area (bottom 20%)
      x: 5 + Math.random() * 80, 
      y: 80 + Math.random() * 10,
    }));
    setPieces(newPieces);
    setPlacedIndices(new Set());
  }, [level]);

  const handlePlace = useCallback((pieceIdx: number, dropX: number, dropY: number) => {
    if (!containerRef.current) return;
    
    // Get board relative coordinates
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((dropX - rect.left) / rect.width) * 100;
    const y = ((dropY - rect.top) / rect.height) * 100;

    const target = level.shapes[pieceIdx];
    const distance = Math.sqrt(
      Math.pow(x - target.targetX, 2) + Math.pow(y - target.targetY, 2)
    );

    // If close enough (tolerance 10%)
    if (distance < 10) {
      soundService.playPlace();
      setPlacedIndices(prev => {
        const next = new Set(prev);
        next.add(pieceIdx);
        return next;
      });
    } else {
      // Missed placement - call onFail to reduce heart
      onFail();
    }
  }, [level, onFail]);

  useEffect(() => {
    if (placedIndices.size === level.shapes.length && level.shapes.length > 0) {
      const timer = setTimeout(onWin, 600);
      return () => clearTimeout(timer);
    }
  }, [placedIndices, level, onWin]);

  const [boardWidth, setBoardWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    let frameId: number;
    
    const observer = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to throttle resize updates
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        for (let entry of entries) {
          setBoardWidth(entry.contentRect.width);
        }
      });
    });
    
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  const pieceSize = useMemo(() => boardWidth ? boardWidth * 0.16 : 58, [boardWidth]);

  return (
    <div 
      className="relative w-full aspect-square bg-gradient-to-br from-[#1e1b4b] to-[#09090b] rounded-3xl border border-arcane-purple/20 shadow-[0_0_40px_rgba(0,0,0,0.6)] overflow-hidden p-0 transform-gpu select-none touch-none" 
      ref={containerRef}
    >
      {/* Background Dots/Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgxMzksIDkyLCAyNDYsIDEpIi8+PC9zdmc+' )` }} />

      {/* Target Slots (Outline) */}
      {level.shapes.map((s, idx) => {
        const shape = s.shapeId && SHAPES[s.shapeId];
        const isPlaced = placedIndices.has(idx);
        
        if (!shape) return null;

        return (
          <div
            key={`slot-${idx}`}
            className="absolute"
            style={{
              left: `${s.targetX}%`,
              top: `${s.targetY}%`,
              width: `${18 * s.scale}%`,
              height: `${18 * s.scale}%`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
            }}
          >
            <div className={`absolute inset-0 transition-opacity duration-1000 ${isPlaced ? 'opacity-0' : 'opacity-100'}`}>
              <div 
                className={`absolute inset-0 border-2 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  (showHints || showGuidedSolution) && !isPlaced 
                    ? 'border-arcane-gold bg-arcane-gold/20 shadow-[0_0_20px_rgba(243,229,171,0.5)] scale-110' 
                    : 'border-dashed border-arcane-purple/40 bg-black/20'
                }`}
              >
                <span className={`font-display text-xl ${(showHints || showGuidedSolution) && !isPlaced ? 'text-arcane-gold animate-pulse text-2xl font-black' : 'text-arcane-purple/20'}`}>
                  {showGuidedSolution ? '☆' : '?'}
                </span>
              </div>
            </div>
            
            <svg viewBox={shape.viewBox} className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
              {/* Permanent subtle hint for all players */}
              {!isPlaced && (
                <path
                  d={shape.path}
                  fill="white"
                  className={`transition-opacity duration-500 ${level.id <= 5 ? 'opacity-[0.08]' : 'opacity-[0.04]'}`}
                />
              )}
              
              {showGuidedSolution && !isPlaced && (
                <path
                  d={shape.path}
                  fill={shape.color}
                  className="opacity-20 animate-pulse"
                  style={{ filter: 'drop-shadow(0 0 8px gold)' }}
                />
              )}
              <path
                d={shape.path}
                fill={isPlaced ? shape.color : 'transparent'}
                stroke={isPlaced ? 'white' : (!isPlaced && level.id <= 5 ? 'rgba(255,255,255,0.05)' : 'transparent')}
                strokeWidth="2"
                strokeDasharray={!isPlaced ? "4 4" : "0"}
                className="transition-all duration-700"
              />
              {isPlaced && (
                <motion.circle
                  initial={{ r: 0, opacity: 1 }}
                  animate={{ r: 100, opacity: 0 }}
                  cx="50" cy="50"
                  fill="none"
                  stroke={shape.color}
                  strokeWidth="2"
                />
              )}
            </svg>
            <AnimatePresence>
              {isPlaced && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1.5 }}
                  className="absolute inset-0 bg-arcane-purple/20 blur-2xl rounded-full" 
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Piece Rack Background */}
      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-black/60 backdrop-blur-xl border-t border-arcane-purple/30 z-0 pointer-events-none" />

      {/* Draggable Pieces */}
      <div className="absolute inset-0 overflow-visible z-20 pointer-events-none">
        {pieces.map((p, idx) => (
          !placedIndices.has(idx) && (
            <div key={`piece-container-${idx}`} className="absolute pointer-events-auto" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
              <PuzzlePiece
                shape={SHAPES[p.shapeId]}
                initialX={0}
                initialY={0}
                size={pieceSize}
                rotation={level.shapes[idx].rotation}
                onPlace={(x, y) => handlePlace(idx, x, y)}
              />
            </div>
          )
        ))}
      </div>
    </div>
  );
}

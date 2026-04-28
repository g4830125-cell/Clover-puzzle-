/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level } from '../types';
import { SHAPES } from '../constants';

export function generateLevels(): Level[] {
  const levels: Level[] = [];
  const shapeIds = Object.keys(SHAPES);

  for (let i = 1; i <= 100; i++) {
    const isBoss = i % 10 === 0;
    // Difficulty: Smoother climb. Level 1-30 are much simpler.
    let numShapes = 2;
    if (i > 30) numShapes = Math.min(4 + Math.floor((i - 30) / 8), 10);
    else if (i > 15) numShapes = 4;
    else if (i > 5) numShapes = 3;
    
    if (isBoss) numShapes = Math.min(numShapes + 2, 12);

    // Economy: Harder to earn gold
    const reward = isBoss ? 40 : 10 + Math.floor(i / 10) * 3;

    const levelShapes = [];
    const usedPositions = new Set<string>();

    for (let j = 0; j < numShapes; j++) {
      const shapeId = shapeIds[Math.floor(Math.random() * shapeIds.length)];
      
      // Generate random positions but keep them somewhat separated
      let targetX, targetY;
      let attempt = 0;
      do {
        // Clearer placements for early levels
        const margin = i < 20 ? 25 : 15;
        targetX = margin + Math.random() * (100 - margin * 2);
        targetY = 15 + Math.random() * 50; 
        
        const gridSpacing = i < 30 ? 20 : 12;
        const posKey = `${Math.floor(targetX / gridSpacing)}-${Math.floor(targetY / gridSpacing)}`;
        if (!usedPositions.has(posKey) || attempt > 10) {
          usedPositions.add(posKey);
          break;
        }
        attempt++;
      } while (true);

      const scale = 0.8 + Math.random() * 0.3;
      // Rotations start later (Level 30) and are simpler early on
      let rotation = 0;
      if (i > 45) {
        rotation = Math.floor(Math.random() * 24) * 15; // 15 deg
      } else if (i > 30) {
        rotation = Math.floor(Math.random() * 4) * 90; // Only 90 deg early on
      }

      levelShapes.push({
        shapeId,
        targetX,
        targetY,
        scale,
        rotation,
      });
    }

    levels.push({
      id: i,
      title: isBoss ? `Boss: Arcane Mastery ${i/10}` : `Path of Mana ${i}`,
      shapes: levelShapes,
      isBoss,
      reward,
    });
  }

  return levels;
}

export const ALL_LEVELS = generateLevels();

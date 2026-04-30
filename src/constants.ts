/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shape } from './types';

export const SHAPES: Record<string, Shape> = {
  clover_3: {
    id: 'clover_3',
    name: 'Trainee Symbol',
    path: 'M 50 20 C 60 10 90 10 90 40 C 90 60 60 90 50 85 C 40 90 10 60 10 40 C 10 10 40 10 50 20 M 50 85 L 50 95',
    color: '#10b981',
    viewBox: '0 0 100 100',
  },
  clover_4: {
    id: 'clover_4',
    name: 'Noble Sigil',
    path: 'M 50 50 L 50 10 M 50 50 L 90 50 M 50 50 L 50 90 M 50 50 L 10 50 M 50 50 Q 70 20 50 10 Q 30 20 50 50 Q 80 30 90 50 Q 80 70 50 50 Q 30 80 50 90 Q 70 80 50 50 Q 20 70 10 50 Q 20 30 50 50',
    color: '#eab308',
    viewBox: '0 0 100 100',
  },
  rune_eye: {
    id: 'rune_eye',
    name: 'Seer Rune',
    path: 'M 10 50 Q 50 10 90 50 Q 50 90 10 50 M 50 35 A 15 15 0 1 1 50 65 A 15 15 0 1 1 50 35 M 50 45 L 50 55',
    color: '#8b5cf6',
    viewBox: '0 0 100 100',
  },
  grimoire: {
    id: 'grimoire',
    name: 'Ancient Tome',
    path: 'M 20 20 L 50 25 L 80 20 L 80 80 L 50 85 L 20 80 Z M 50 25 L 50 85',
    color: '#8b4513',
    viewBox: '0 0 100 100',
  },
  sword: {
    id: 'sword',
    name: 'Demon Dweller',
    path: 'M 50 10 L 60 30 L 55 80 L 45 80 L 40 30 Z M 35 80 L 65 80 L 65 85 L 35 85 Z M 50 85 L 50 95',
    color: '#475569',
    viewBox: '0 0 100 100',
  },
  void_gate: {
    id: 'void_gate',
    name: 'Void Gate',
    path: 'M 10 90 L 90 90 L 90 85 L 10 85 Z M 20 85 L 20 30 Q 50 10 80 30 L 80 85 M 30 85 L 30 40 Q 50 25 70 40 L 70 85',
    color: '#1e293b',
    viewBox: '0 0 100 100',
    difficulty: 'hard',
  },
  arcane_eye: {
    id: 'arcane_eye',
    name: 'Arcane Eye',
    path: 'M 10 50 Q 50 10 90 50 Q 50 90 10 50 M 50 25 A 25 25 0 1 1 50 75 A 25 25 0 1 1 50 25 M 50 35 A 15 15 0 1 0 50 65 A 15 15 0 1 0 50 35 M 45 50 A 5 5 0 1 1 55 50 A 5 5 0 1 1 45 50',
    color: '#a855f7',
    viewBox: '0 0 100 100',
    difficulty: 'hard',
  },
  fractal_star: {
    id: 'fractal_star',
    name: 'Fractal Star',
    path: 'M 50 10 L 60 40 L 90 40 L 65 60 L 75 90 L 50 70 L 25 90 L 35 60 L 10 40 L 40 40 Z M 50 30 L 55 45 L 70 45 L 57 55 L 62 70 L 50 60 L 38 70 L 43 55 L 30 45 L 45 45 Z',
    color: '#facc15',
    viewBox: '0 0 100 100',
    difficulty: 'hard',
  },
};

export const INITIAL_GAME_STATE = {
  currentLevel: 1,
  lives: 3,
  gold: 100,
  unlockedLevels: 1,
  achievements: [
    {
      id: 'first_win',
      title: 'First Spell',
      description: 'Complete your first puzzle',
      icon: 'sparkles',
      isUnlocked: false,
      requirement: 1,
      currentValue: 0,
    },
    {
      id: 'hoarder',
      title: 'Gold Hoarder',
      description: 'Earn 500 gold coins',
      icon: 'coins',
      isUnlocked: false,
      requirement: 500,
      currentValue: 100,
    },
    {
      id: 'master',
      title: 'Grand Mage',
      description: 'Complete 50 levels',
      icon: 'trophy',
      isUnlocked: false,
      requirement: 50,
      currentValue: 0,
    },
  ],
  lastDailyReward: null,
  hasClaimedLaunchReward: false,
  userId: '',
  name: '',
};

export const RECOVERY_COST = 50;
export const WIN_REWARD = 20;
export const BOSS_REWARD = 100;

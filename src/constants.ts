/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shape } from './types';

export const SHAPES: Record<string, Shape> = {
  CLOVER_3: {
    id: 'clover_3',
    name: 'Trainee Symbol',
    path: 'M 50 20 C 60 10 90 10 90 40 C 90 60 60 90 50 85 C 40 90 10 60 10 40 C 10 10 40 10 50 20 M 50 85 L 50 95',
    color: '#10b981',
    viewBox: '0 0 100 100',
  },
  CLOVER_4: {
    id: 'clover_4',
    name: 'Noble Sigil',
    path: 'M 50 50 L 50 10 M 50 50 L 90 50 M 50 50 L 50 90 M 50 50 L 10 50 M 50 50 Q 70 20 50 10 Q 30 20 50 50 Q 80 30 90 50 Q 80 70 50 50 Q 30 80 50 90 Q 70 80 50 50 Q 20 70 10 50 Q 20 30 50 50',
    color: '#eab308',
    viewBox: '0 0 100 100',
  },
  RUNE_EYE: {
    id: 'rune_eye',
    name: 'Seer Rune',
    path: 'M 10 50 Q 50 10 90 50 Q 50 90 10 50 M 50 35 A 15 15 0 1 1 50 65 A 15 15 0 1 1 50 35 M 50 45 L 50 55',
    color: '#8b5cf6',
    viewBox: '0 0 100 100',
  },
  GRIMOIRE: {
    id: 'grimoire',
    name: 'Ancient Tome',
    path: 'M 20 20 L 50 25 L 80 20 L 80 80 L 50 85 L 20 80 Z M 50 25 L 50 85',
    color: '#8b4513',
    viewBox: '0 0 100 100',
  },
  SWORD: {
    id: 'sword',
    name: 'Demon Dweller',
    path: 'M 50 10 L 60 30 L 55 80 L 45 80 L 40 30 Z M 35 80 L 65 80 L 65 85 L 35 85 Z M 50 85 L 50 95',
    color: '#475569',
    viewBox: '0 0 100 100',
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

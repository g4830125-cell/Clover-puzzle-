/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Shape {
  id: string;
  name: string;
  path: string; // SVG path data
  color: string;
  viewBox: string;
}

export interface Level {
  id: number;
  title: string;
  shapes: {
    shapeId: string;
    targetX: number;
    targetY: number;
    scale: number;
    rotation: number;
  }[];
  isBoss?: boolean;
  reward: number;
}

export interface GameState {
  currentLevel: number;
  lives: number;
  gold: number;
  unlockedLevels: number;
  achievements: Achievement[];
  lastDailyReward: string | null;
  hasClaimedLaunchReward: boolean;
  userId?: string;
  name?: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  level: number;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  requirement: number;
  currentValue: number;
}

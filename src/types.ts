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
  difficulty?: 'easy' | 'medium' | 'hard';
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
  lastWheelSpin: string | null;
  hints: number;
  hasClaimedLaunchReward: boolean;
  userId?: string;
  name?: string;
  email?: string;
  settings: {
    showFPS: boolean;
    showPing: boolean;
    isSoundEnabled: boolean;
  };
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

export type MultiplayerMode = '1v1' | '2v2';

export interface MultiplayerPlayer {
  userId: string;
  name: string;
  socketId: string;
  team?: 'A' | 'B';
  score?: number;
  chances?: number;
  isBot?: boolean;
}

export interface Friend {
  userId: string;
  name: string;
  level: number;
  status: 'online' | 'offline' | 'in-game';
}

export interface FriendRequest {
  fromId: string;
  fromName: string;
  toId: string;
  timestamp: string;
}

export interface GameInvite {
  id: string;
  fromId: string;
  fromName: string;
  mode: MultiplayerMode;
  timestamp: string;
}

export interface SocialState {
  friends: Friend[];
  requests: FriendRequest[];
  invites: GameInvite[];
}

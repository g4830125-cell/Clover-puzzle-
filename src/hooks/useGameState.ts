/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { GameState } from '../types';
import { INITIAL_GAME_STATE } from '../constants';

export function useGameState() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('grimoire_quest_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.userId) {
          parsed.userId = 'user-' + Math.random().toString(36).substr(2, 9);
        }
        return parsed;
      } catch (e) {
        const fresh = { ...INITIAL_GAME_STATE, userId: 'user-' + Math.random().toString(36).substr(2, 9) };
        return fresh;
      }
    }
    const freshStart = { ...INITIAL_GAME_STATE, userId: 'user-' + Math.random().toString(36).substr(2, 9) };
    return freshStart;
  });

  useEffect(() => {
    localStorage.setItem('grimoire_quest_state', JSON.stringify(state));
  }, [state]);

  const updateLevel = (inc = 1) => {
    setState(prev => ({
      ...prev,
      currentLevel: prev.currentLevel + inc,
      unlockedLevels: Math.max(prev.unlockedLevels, prev.currentLevel + inc),
    }));
  };

  const addGold = (amount: number) => {
    setState(prev => ({ ...prev, gold: prev.gold + amount }));
  };

  const useLife = () => {
    setState(prev => ({ ...prev, lives: Math.max(0, prev.lives - 1) }));
  };

  const recoverLife = (cost: number = 0) => {
    if (state.gold >= cost) {
      setState(prev => ({
        ...prev,
        gold: prev.gold - (cost || 0),
        lives: Math.min(5, prev.lives + 1),
      }));
      return true;
    }
    return false;
  };

  const checkAchievements = useCallback((newState: GameState) => {
    let changed = false;
    const updatedAchievements = newState.achievements.map(a => {
      if (a.isUnlocked) return a;

      let newValue = a.currentValue;
      if (a.id === 'first_win') newValue = newState.unlockedLevels - 1;
      if (a.id === 'hoarder') newValue = newState.gold;
      if (a.id === 'master') newValue = newState.unlockedLevels - 1;

      if (newValue >= a.requirement && !a.isUnlocked) {
        changed = true;
        return { ...a, currentValue: newValue, isUnlocked: true };
      }
      return { ...a, currentValue: newValue };
    });

    if (changed) {
      setState(prev => ({ ...prev, achievements: updatedAchievements }));
    }
  }, [setState]);

  const claimDailyReward = (reward: number) => {
    setState(prev => ({
      ...prev,
      gold: prev.gold + reward,
      lastDailyReward: new Date().toDateString(),
    }));
  };

  const addHint = (amount: number) => {
    setState(prev => ({ ...prev, hints: prev.hints + amount }));
  };

  const claimWheelReward = (type: 'gold' | 'hint', amount: number) => {
    setState(prev => ({
      ...prev,
      gold: type === 'gold' ? prev.gold + amount : prev.gold,
      hints: type === 'hint' ? prev.hints + amount : prev.hints,
      lastWheelSpin: new Date().toISOString(),
    }));
  };

  const claimLaunchReward = useCallback(() => {
    setState(prev => {
      if (prev.hasClaimedLaunchReward) return prev;
      return {
        ...prev,
        gold: prev.gold + 1000,
        hasClaimedLaunchReward: true,
      };
    });
  }, [setState]);

  const resetGame = () => setState(INITIAL_GAME_STATE);

  return { state, updateLevel, addGold, addHint, useLife, recoverLife, resetGame, setState, claimDailyReward, claimWheelReward, claimLaunchReward };
}

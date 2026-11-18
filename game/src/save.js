// Save and load for Coral Keys: one JSON blob in localStorage. Saving never
// touches the server and never needs a network request.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      v: 1, // save format version, so an older save can be recognised later
      cash: state.player.cash,
      health: state.player.health,
      missionIndex: state.missionIndex,
      hasPackage: state.hasPackage,
      x: state.player.x,
      y: state.player.y,
      clock: state.clock,
      day: state.day,
      shells: state.shellsCollected,
      storyDone: state.storyDone,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

// The story of Coral Keys: three missions from Marisol at the bait shop.
// Each mission has an objective marker on the map and in the HUD, a short
// line of dialogue, and a cash reward. Finishing all three ends the story;
// the town stays open for free roam afterwards.
import { LANDMARKS, MISSION_REWARDS } from './config.js';
import { raiseWanted } from './police.js';

export const MISSION_TITLES = [
  'Meet Marisol',
  'The Dock Drop',
  'Heat on the Keys',
];

function missionObjective(state) {
  const index = state.missionIndex;
  if (index === 0) {
    return {
      text: 'Meet Marisol at Coral Bait & Tackle',
      marker: { x: LANDMARKS.baitShop.x, y: LANDMARKS.baitShop.y - 60 },
      hint: 'Follow the yellow marker. Walk with WASD, get in a car with E.',
    };
  }
  if (index === 1 && !state.hasPackage) {
    return {
      text: 'Pick up the crate at Marina Pier',
      marker: { x: LANDMARKS.marina.x, y: LANDMARKS.marina.y },
      hint: 'Marisol needs a crate moved. No questions, good money.',
    };
  }
  if (index === 1) {
    return {
      text: 'Deliver the crate to Sunset Motel',
      marker: { x: LANDMARKS.motel.x, y: LANDMARKS.motel.y - 80 },
      hint: 'Keep it quiet. The crate is not yours to open.',
    };
  }
  return {
    text: 'Lose the heat: reach the Old Boatyard',
    marker: { x: LANDMARKS.hideout.x, y: LANDMARKS.hideout.y + 120 },
    hint: 'Three stars and the whole county behind you. Run for the boatyard.',
  };
}

export function currentObjective(state) {
  if (state.missionIndex >= MISSION_TITLES.length) {
    return { text: 'Coral Keys is yours — free roam', marker: null, hint: 'Collect shells on the beach, $10 each. Q saves your game.' };
  }
  return missionObjective(state);
}

export function missionTitle(state) {
  if (state.missionIndex >= MISSION_TITLES.length) return 'Free Roam';
  return MISSION_TITLES[state.missionIndex];
}

function finishMission(state) {
  const reward = MISSION_REWARDS[state.missionIndex] || 0;
  state.player.cash += reward;
  state.message = `Mission complete: ${MISSION_TITLES[state.missionIndex]}  +$${reward}`;
  state.messageTimer = 4;
  state.missionIndex += 1;
  state.hasPackage = false;
  if (state.missionIndex >= MISSION_TITLES.length) {
    state.storyDone = true;
    state.message = 'Story complete! Coral Keys is yours now. +$300';
  }
}

function closeTo(player, point, distance) {
  return Math.hypot(player.x - point.x, player.y - point.y) < distance;
}

/** Check mission triggers after movement; true when a mission advanced. */
export function updateMissions(state) {
  const player = state.player;
  const index = state.missionIndex;
  if (index >= MISSION_TITLES.length) return false;

  if (index === 0) {
    if (closeTo(player, LANDMARKS.baitShop, 130)) {
      finishMission(state);
      state.message = 'Marisol: "Kai. You look hungry. Move a crate for me and eat tonight."  Mission complete +$50';
      state.messageTimer = 5;
      return true;
    }
    return false;
  }

  if (index === 1) {
    if (!state.hasPackage && closeTo(player, LANDMARKS.marina, 130)) {
      state.hasPackage = true;
      state.message = 'Crate collected. Get it to Sunset Motel — quietly.';
      state.messageTimer = 4;
      return false;
    }
    if (state.hasPackage && closeTo(player, LANDMARKS.motel, 140)) {
      finishMission(state);
      return true;
    }
    return false;
  }

  // Mission 3: the heat is on from the moment it starts.
  if (!state.mission3Started) {
    state.mission3Started = true;
    raiseWanted(state, 3);
    state.message = 'Marisol: "They know, Kai. Run for the Old Boatyard, now!"';
    state.messageTimer = 5;
  }
  if (closeTo(player, LANDMARKS.hideout, 150)) {
    state.wanted = 0;
    state.lastCrimeAt = state.elapsed;
    finishMission(state);
    return true;
  }
  return false;
}

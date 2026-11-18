// The chained mission list: each completed mission unlocks the next and changes the city heat.
import { MISSION_DIALOGS } from './story.js';

export const MISSIONS = [
  { id: 'meet-mara', title: 'First Contact', objective: 'Meet Mara at Cafe Sol', targetX: 1125, targetY: 675, reward: 150, wantedOnStart: 0 },
  { id: 'neon-pickup', title: 'Neon Pickup', objective: 'Pick up the singer at the Neon Arcade', targetX: 2475, targetY: 675, reward: 220, wantedOnStart: 1 },
  { id: 'marina-crate', title: 'Marina Crate', objective: 'Collect the crate at the Marina Docks', targetX: 675, targetY: 2025, reward: 300, wantedOnStart: 1 },
  { id: 'lose-the-heat', title: 'Lose the Heat', objective: 'Shake the police, then reach the Safehouse', targetX: 1125, targetY: 1575, reward: 380, wantedOnStart: 3 },
  { id: 'warehouse-payback', title: 'Warehouse Payback', objective: 'Confront the crew at the Old Warehouse', targetX: 2925, targetY: 2025, reward: 520, wantedOnStart: 2 },
  { id: 'bank-heist', title: 'The Palm City Heist', objective: 'Reach Palmera Bank and finish the heist', targetX: 1575, targetY: 1125, reward: 900, wantedOnStart: 4 },
];

export function createMissionState() {
  return { index: 0, completeFlash: 0, completeText: '', finishedStory: false, dialogQueue: [], dialogActive: false };
}

export function currentMission(state) {
  return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
}

export function missionDialogFor(index) {
  return MISSION_DIALOGS[Math.min(index, MISSION_DIALOGS.length - 1)] || [];
}

export function checkMissionArrival(state, playerX, playerY) {
  const mission = currentMission(state);
  if (!mission) return null;
  const dx = playerX - mission.targetX, dy = playerY - mission.targetY;
  if (dx * dx + dy * dy < 78 * 78) return mission;
  return null;
}

export function completeCurrentMission(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  state.index += 1;
  state.completeFlash = 3.2;
  state.completeText = `MISSION COMPLETE  +$${mission.reward}`;
  if (state.index >= MISSIONS.length) state.finishedStory = true;
  return mission;
}

export function updateMissionTimers(state, dt) {
  if (state.completeFlash > 0) state.completeFlash -= dt;
}

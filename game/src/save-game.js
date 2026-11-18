// localStorage save: mission progress, money, health and player position.

export const SAVE_KEY = 'palm-city-heist-save-v1';

export function saveGameState(snapshot) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); return true; } catch { return false; }
}

export function loadGameState() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.money !== 'number') return null;
    return parsed;
  } catch { return null; }
}

export function clearSavedGame() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

export function hasSavedGame() { return loadGameState() !== null; }

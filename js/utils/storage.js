const STORAGE_KEY = 'znum-player-name';

/**
 * Load a saved player name from localStorage.
 * @param {number} [index=0] - Player slot (0 or 1)
 * @returns {string} The saved name, or empty string if not found
 */
export function loadPlayerName(index = 0) {
  try {
    return localStorage.getItem(`${STORAGE_KEY}-${index}`) || '';
  } catch {
    return '';
  }
}

/**
 * Save a player name to localStorage.
 * @param {string} name
 * @param {number} [index=0] - Player slot (0 or 1)
 */
export function savePlayerName(name, index = 0) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${index}`, name);
  } catch {
    // localStorage not available
  }
}

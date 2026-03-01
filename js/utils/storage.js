const STORAGE_KEY = 'znum-player-name';

export function loadPlayerName(index = 0) {
  try {
    return localStorage.getItem(`${STORAGE_KEY}-${index}`) || '';
  } catch {
    return '';
  }
}

export function savePlayerName(name, index = 0) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${index}`, name);
  } catch {
    // localStorage not available
  }
}

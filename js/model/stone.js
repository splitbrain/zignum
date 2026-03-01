import { STONE_INVERT, STONE_RANDOM, STONE_SKIP } from './constants.js';

export function createStone() {
  return {
    value: Math.floor(Math.random() * 9) + 1,
    sign: Math.random() < 0.5 ? 1 : -1,
    type: 'normal',
    picked: false
  };
}

export function createSpecialStone(specialType) {
  return {
    value: 0,
    sign: 1,
    type: specialType,
    picked: false
  };
}

export function displayValue(stone) {
  if (stone.picked) return '';
  switch (stone.type) {
    case STONE_INVERT: return 'INV';
    case STONE_RANDOM: return 'RND';
    case STONE_SKIP: return 'SKP';
    default: {
      const val = stone.value * stone.sign;
      return val > 0 ? `+${val}` : `${val}`;
    }
  }
}

export function effectiveValue(stone) {
  if (stone.type !== 'normal') return 0;
  return stone.value * stone.sign;
}

export function isSpecial(stone) {
  return stone.type !== 'normal';
}

export function cloneStone(stone) {
  return { ...stone };
}

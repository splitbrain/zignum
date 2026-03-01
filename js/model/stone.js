/**
 * @typedef {Object} Stone
 * @property {number} value - Numeric value (1-9 for normal stones, 0 for special)
 * @property {1|-1} sign - Positive or negative multiplier
 * @property {'normal'|'invert'|'random'|'skip'} type - Stone type
 * @property {boolean} picked - Whether the stone has been picked
 */

import { STONE_INVERT, STONE_RANDOM, STONE_SKIP } from './constants.js';

/**
 * Create a normal stone with random value (1-9) and random sign.
 * @returns {Stone}
 */
export function createStone() {
  return {
    value: Math.floor(Math.random() * 9) + 1,
    sign: Math.random() < 0.5 ? 1 : -1,
    type: 'normal',
    picked: false
  };
}

/**
 * Create a special stone (INV, RND, or SKP) with no numeric value.
 * @param {'invert'|'random'|'skip'} specialType
 * @returns {Stone}
 */
export function createSpecialStone(specialType) {
  return {
    value: 0,
    sign: 1,
    type: specialType,
    picked: false
  };
}

/**
 * Return the display string for a stone (e.g. "+5", "-3", "INV", "RND", "SKP", or "").
 * @param {Stone} stone
 * @returns {string}
 */
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

/**
 * Return the signed numeric value of a stone. Special stones return 0.
 * @param {Stone} stone
 * @returns {number}
 */
export function effectiveValue(stone) {
  if (stone.type !== 'normal') return 0;
  return stone.value * stone.sign;
}

/**
 * Check whether a stone is a special type (not 'normal').
 * @param {Stone} stone
 * @returns {boolean}
 */
export function isSpecial(stone) {
  return stone.type !== 'normal';
}

/**
 * Return a shallow clone of a stone.
 * @param {Stone} stone
 * @returns {Stone}
 */
export function cloneStone(stone) {
  return { ...stone };
}

/**
 * @typedef {Object} Player
 * @property {string} name
 * @property {number} score
 * @property {boolean} isAI
 */

/**
 * Create a new player with zero score.
 * @param {string} name
 * @param {boolean} [isAI=false]
 * @returns {Player}
 */
export function createPlayer(name, isAI = false) {
  return {
    name,
    score: 0,
    isAI
  };
}

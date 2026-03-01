/** @typedef {import('./stone.js').Stone} Stone */

import { GRID_SIZE, SPECIAL_COUNT, SPECIAL_TYPES } from './constants.js';
import { createStone, createSpecialStone, cloneStone } from './stone.js';

/**
 * Create a new GRID_SIZE x GRID_SIZE board with random stones and
 * SPECIAL_COUNT randomly placed special stones.
 * @returns {Stone[]} Flat array of length GRID_SIZE^2, indexed as row * GRID_SIZE + col
 */
export function createBoard() {
  const board = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    board.push(createStone());
  }

  // Place special stones at random positions
  const positions = [];
  while (positions.length < SPECIAL_COUNT) {
    const pos = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }

  for (const pos of positions) {
    const specialType = SPECIAL_TYPES[Math.floor(Math.random() * SPECIAL_TYPES.length)];
    board[pos] = createSpecialStone(specialType);
  }

  return board;
}

/**
 * Get the stone at the given grid position.
 * @param {Stone[]} board
 * @param {number} col
 * @param {number} row
 * @returns {Stone}
 */
export function getStone(board, col, row) {
  return board[row * GRID_SIZE + col];
}

/**
 * Get all unpicked stones in the active line.
 * @param {Stone[]} board
 * @param {'row'|'col'} lineType
 * @param {number} lineIndex
 * @returns {{ stone: Stone, col: number, row: number }[]}
 */
export function getActiveLine(board, lineType, lineIndex) {
  const stones = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const col = lineType === 'row' ? i : lineIndex;
    const row = lineType === 'row' ? lineIndex : i;
    const stone = getStone(board, col, row);
    if (!stone.picked) {
      stones.push({ stone, col, row });
    }
  }
  return stones;
}

/**
 * Check whether the given line has at least one unpicked stone.
 * @param {Stone[]} board
 * @param {'row'|'col'} lineType
 * @param {number} lineIndex
 * @returns {boolean}
 */
export function hasAvailableStones(board, lineType, lineIndex) {
  return getActiveLine(board, lineType, lineIndex).length > 0;
}

/**
 * Return a deep clone of the board (each stone is shallow-cloned).
 * @param {Stone[]} board
 * @returns {Stone[]}
 */
export function cloneBoard(board) {
  return board.map(s => cloneStone(s));
}

/**
 * Invert the sign of every unpicked normal stone on the board (mutates in place).
 * @param {Stone[]} board
 */
export function invertBoard(board) {
  for (const stone of board) {
    if (stone.type === 'normal' && !stone.picked) {
      stone.sign *= -1;
    }
  }
}

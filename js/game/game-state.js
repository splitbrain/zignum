/** @typedef {import('./stone.js').Stone} Stone */
/** @typedef {import('./player.js').Player} Player */

/**
 * @typedef {Object} GameState
 * @property {Stone[]} board - Flat array of stones
 * @property {Player[]} players - Two-element array of players
 * @property {number} currentPlayer - Index (0 or 1) of the active player
 * @property {'row'|'col'} activeLineType - Orientation of the active line
 * @property {number} activeLineIndex - Index of the active row or column
 * @property {boolean} gameOver - Whether the game has ended
 * @property {number|'tie'|null} winner - Index of winner, 'tie', or null
 * @property {Object|null} lastMove - Details of the most recent move
 * @property {string} mode - Game mode ('solo', 'hotseat', 'network')
 */

import { GRID_SIZE, LINE_ROW, LINE_COL } from '../model/constants.js';
import { createBoard } from '../model/board.js';

/**
 * Create a fresh game state with a random board, random starting line, and
 * random starting player.
 * @param {Player} player1
 * @param {Player} player2
 * @param {string} mode - 'solo', 'hotseat', or 'network'
 * @returns {GameState}
 */
export function createGameState(player1, player2, mode) {
  const activeLineType = Math.random() < 0.5 ? LINE_ROW : LINE_COL;
  const activeLineIndex = Math.floor(Math.random() * GRID_SIZE);
  const currentPlayer = Math.floor(Math.random() * 2);

  return {
    board: createBoard(),
    players: [{ ...player1 }, { ...player2 }],
    currentPlayer,
    activeLineType,
    activeLineIndex,
    gameOver: false,
    winner: null,
    lastMove: null,
    mode
  };
}

/** @typedef {import('./game-state.js').GameState} GameState */

import { LINE_ROW, LINE_COL, STONE_INVERT, STONE_RANDOM, STONE_SKIP, GRID_SIZE } from '../model/constants.js';
import { getActiveLine, hasAvailableStones, invertBoard, cloneBoard } from '../model/board.js';
import { effectiveValue } from '../model/stone.js';

/**
 * Get all available (unpicked) moves in the current active line.
 * @param {GameState} state
 * @returns {{ stone: import('../model/stone.js').Stone, col: number, row: number }[]}
 */
export function getAvailableMoves(state) {
  return getActiveLine(state.board, state.activeLineType, state.activeLineIndex);
}

/**
 * Check whether picking the stone at (col, row) is a valid move.
 * @param {GameState} state
 * @param {number} col
 * @param {number} row
 * @returns {boolean}
 */
export function isValidMove(state, col, row) {
  const moves = getAvailableMoves(state);
  return moves.some(m => m.col === col && m.row === row);
}

/**
 * Apply a move to a board (mutates it). Handles marking picked, applying
 * stone effects (invert/skip), and computing the next active line.
 *
 * @param {Array} board - The board array (will be mutated)
 * @param {number} col - Column of the picked stone
 * @param {number} row - Row of the picked stone
 * @param {string} activeLineType - Current active line type ('row' or 'col')
 * @returns {{ stoneType: string, scoreValue: number, skips: boolean, nextLineType: string, nextLineIndex: number }}
 */
export function applyMoveToBoard(board, col, row, activeLineType) {
  const stone = board[row * GRID_SIZE + col];
  const stoneType = stone.type;

  // Mark stone as picked
  stone.picked = true;

  // Compute score value for normal stones (before mutation)
  let scoreValue = 0;
  if (stoneType === 'normal') {
    scoreValue = effectiveValue({ ...stone, picked: false });
  }

  // Apply board-level side effects
  if (stoneType === STONE_INVERT) {
    invertBoard(board);
  }

  // Switch active line (always, even for Skip)
  const nextLineType = activeLineType === LINE_ROW ? LINE_COL : LINE_ROW;
  const nextLineIndex = activeLineType === LINE_ROW ? col : row;

  return {
    stoneType,
    scoreValue,
    skips: stoneType === STONE_SKIP,
    nextLineType,
    nextLineIndex
  };
}

/**
 * Pick a stone and produce a new immutable game state. Handles scoring,
 * special stone effects, line switching, turn switching, and game-over detection.
 *
 * @param {GameState} state - Current game state
 * @param {number} col
 * @param {number} row
 * @param {number} [randomValue] - Predetermined random value (for network sync)
 * @returns {{ state: GameState, randomValue: number|null }}
 */
export function pickStone(state, col, row, randomValue) {
  const newBoard = cloneBoard(state.board);
  const newPlayers = state.players.map(p => ({ ...p }));

  const move = applyMoveToBoard(newBoard, col, row, state.activeLineType);

  let effect = null;
  let generatedRandomValue = null;

  switch (move.stoneType) {
    case 'normal':
      newPlayers[state.currentPlayer].score += move.scoreValue;
      break;

    case STONE_INVERT:
      effect = 'invert';
      break;

    case STONE_RANDOM: {
      if (randomValue !== undefined && randomValue !== null) {
        generatedRandomValue = randomValue;
      } else {
        const val = Math.floor(Math.random() * 9) + 1;
        const sign = Math.random() < 0.5 ? 1 : -1;
        generatedRandomValue = val * sign;
      }
      newPlayers[state.currentPlayer].score += generatedRandomValue;
      effect = 'random';
      break;
    }

    case STONE_SKIP:
      effect = 'skip';
      break;
  }

  const newCurrentPlayer = move.skips ? state.currentPlayer : 1 - state.currentPlayer;

  // Check game over
  const gameOver = !hasAvailableStones(newBoard, move.nextLineType, move.nextLineIndex);
  let winner = null;
  if (gameOver) {
    winner = getWinner(newPlayers);
  }

  const newState = {
    board: newBoard,
    players: newPlayers,
    currentPlayer: newCurrentPlayer,
    activeLineType: move.nextLineType,
    activeLineIndex: move.nextLineIndex,
    gameOver,
    winner,
    lastMove: { col, row, stoneType: move.stoneType, effect, randomValue: generatedRandomValue },
    mode: state.mode
  };

  return { state: newState, randomValue: generatedRandomValue };
}

/**
 * Determine the winner from the final player scores.
 * @param {import('../model/player.js').Player[]} players - Two-element array of players
 * @returns {0|1|'tie'} Index of the winning player, or 'tie'
 */
function getWinner(players) {
  if (players[0].score > players[1].score) return 0;
  if (players[1].score > players[0].score) return 1;
  return 'tie';
}


import { AI_DEPTH, GRID_SIZE, STONE_INVERT, STONE_RANDOM, STONE_SKIP } from '../model/constants.js';
import { getActiveLine, cloneBoard, invertBoard, getStone, hasAvailableStones } from '../model/board.js';
import { effectiveValue } from '../model/stone.js';

/**
 * Find the best move for the AI player.
 * Returns { col, row } of the best stone to pick.
 */
export function findBestMove(state) {
  const moves = getActiveLine(state.board, state.activeLineType, state.activeLineIndex);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestValue = -Infinity;

  const aiPlayer = state.currentPlayer;

  for (const { stone, col, row } of moves) {
    const board = cloneBoard(state.board);
    board[row * GRID_SIZE + col].picked = true;

    let moveValue = 0;
    let nextLineType = state.activeLineType === 'row' ? 'col' : 'row';
    let nextLineIndex = state.activeLineType === 'row' ? col : row;
    let isMyTurnNext;

    if (stone.type === STONE_INVERT) {
      invertBoard(board);
      moveValue = 0;
      isMyTurnNext = false; // opponent's turn next
    } else if (stone.type === STONE_RANDOM) {
      moveValue = 0; // treat random as 0 value
      isMyTurnNext = false;
    } else if (stone.type === STONE_SKIP) {
      moveValue = 0;
      isMyTurnNext = true; // AI gets another turn
    } else {
      moveValue = effectiveValue(stone);
      isMyTurnNext = false;
    }

    const futureValue = evaluate(board, nextLineType, nextLineIndex, isMyTurnNext, 1);
    const totalValue = moveValue + futureValue;

    if (totalValue > bestValue) {
      bestValue = totalValue;
      bestMove = { col, row };
    }
  }

  return bestMove;
}

/**
 * Recursive evaluation function.
 * Evaluates the value of a board position from the AI's perspective.
 *
 * @param {Array} board - The board state
 * @param {string} lineType - Current active line type ('row' or 'col')
 * @param {number} lineIndex - Current active line index
 * @param {boolean} isMyTurn - Whether it's the AI's turn
 * @param {number} depth - Current recursion depth
 * @returns {number} Evaluated score from AI's perspective
 */
function evaluate(board, lineType, lineIndex, isMyTurn, depth) {
  const moves = getActiveLine(board, lineType, lineIndex);

  // Base case: no moves available (game over for this line)
  if (moves.length === 0) {
    return 0;
  }

  // Base case: max depth reached
  if (depth >= AI_DEPTH) {
    return 0;
  }

  let bestValue = isMyTurn ? -Infinity : Infinity;

  for (const { stone, col, row } of moves) {
    const simBoard = cloneBoard(board);
    simBoard[row * GRID_SIZE + col].picked = true;

    let moveValue = 0;
    let nextLineType = lineType === 'row' ? 'col' : 'row';
    let nextLineIndex = lineType === 'row' ? col : row;
    let nextIsMyTurn;

    if (stone.type === STONE_INVERT) {
      invertBoard(simBoard);
      moveValue = 0;
      nextIsMyTurn = !isMyTurn;
    } else if (stone.type === STONE_RANDOM) {
      moveValue = 0;
      nextIsMyTurn = !isMyTurn;
    } else if (stone.type === STONE_SKIP) {
      moveValue = 0;
      nextIsMyTurn = isMyTurn; // same player continues
    } else {
      moveValue = effectiveValue(stone);
      if (!isMyTurn) {
        moveValue = -moveValue; // opponent's gain is AI's loss
      }
      nextIsMyTurn = !isMyTurn;
    }

    const depthFactor = 1 / (depth + 1);
    const futureValue = evaluate(simBoard, nextLineType, nextLineIndex, nextIsMyTurn, depth + 1);
    const totalValue = moveValue * depthFactor + futureValue;

    if (isMyTurn) {
      bestValue = Math.max(bestValue, totalValue);
    } else {
      bestValue = Math.min(bestValue, totalValue);
    }
  }

  return bestValue;
}

import { AI_DEPTH, STONE_RANDOM, STONE_SKIP } from '../model/constants.js';
import { getActiveLine, cloneBoard } from '../model/board.js';
import { applyMoveToBoard } from './game-logic.js';

/**
 * Find the best move for the AI player using minimax look-ahead.
 * @param {import('./game-state.js').GameState} state - Current game state
 * @returns {{ col: number, row: number }|null} Best stone to pick, or null if no moves
 */
export function findBestMove(state) {
  const moves = getActiveLine(state.board, state.activeLineType, state.activeLineIndex);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestValue = -Infinity;

  for (const { col, row } of moves) {
    const board = cloneBoard(state.board);
    const move = applyMoveToBoard(board, col, row, state.activeLineType);

    const moveValue = move.scoreValue;
    const isMyTurnNext = move.skips;

    const futureValue = evaluate(board, move.nextLineType, move.nextLineIndex, isMyTurnNext, 1);
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

  for (const { col, row } of moves) {
    const simBoard = cloneBoard(board);
    const move = applyMoveToBoard(simBoard, col, row, lineType);

    let moveValue = move.scoreValue;
    if (!isMyTurn) {
      moveValue = -moveValue; // opponent's gain is AI's loss
    }

    const nextIsMyTurn = move.skips ? isMyTurn : !isMyTurn;

    const depthFactor = 1 / (depth + 1);
    const futureValue = evaluate(simBoard, move.nextLineType, move.nextLineIndex, nextIsMyTurn, depth + 1);
    const totalValue = moveValue * depthFactor + futureValue;

    if (isMyTurn) {
      bestValue = Math.max(bestValue, totalValue);
    } else {
      bestValue = Math.min(bestValue, totalValue);
    }
  }

  return bestValue;
}

import { LINE_ROW, LINE_COL, STONE_INVERT, STONE_RANDOM, STONE_SKIP, GRID_SIZE } from '../model/constants.js';
import { getStone, getActiveLine, hasAvailableStones, invertBoard, cloneBoard } from '../model/board.js';
import { effectiveValue } from '../model/stone.js';

export function getAvailableMoves(state) {
  return getActiveLine(state.board, state.activeLineType, state.activeLineIndex);
}

export function isValidMove(state, col, row) {
  const moves = getAvailableMoves(state);
  return moves.some(m => m.col === col && m.row === row);
}

export function pickStone(state, col, row, randomValue) {
  // Clone the state for immutability
  const newBoard = cloneBoard(state.board);
  const newPlayers = state.players.map(p => ({ ...p }));
  let newActiveLineType = state.activeLineType;
  let newActiveLineIndex = state.activeLineIndex;
  let newCurrentPlayer = state.currentPlayer;

  const stone = newBoard[row * GRID_SIZE + col];
  const stoneType = stone.type;

  // Mark stone as picked
  stone.picked = true;

  let effect = null;
  let generatedRandomValue = null;

  // Apply stone effect
  switch (stoneType) {
    case 'normal':
      newPlayers[state.currentPlayer].score += effectiveValue({ ...stone, picked: false });
      break;

    case STONE_INVERT:
      invertBoard(newBoard);
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

  // Switch active line (always, even for Skip)
  if (newActiveLineType === LINE_ROW) {
    newActiveLineType = LINE_COL;
    newActiveLineIndex = col;
  } else {
    newActiveLineType = LINE_ROW;
    newActiveLineIndex = row;
  }

  // Determine next player
  if (stoneType === STONE_SKIP) {
    // Same player gets another turn
  } else {
    newCurrentPlayer = 1 - state.currentPlayer;
  }

  // Check game over
  const gameOver = !hasAvailableStones(newBoard, newActiveLineType, newActiveLineIndex);
  let winner = null;
  if (gameOver) {
    winner = getWinner(newPlayers);
  }

  const newState = {
    board: newBoard,
    players: newPlayers,
    currentPlayer: newCurrentPlayer,
    activeLineType: newActiveLineType,
    activeLineIndex: newActiveLineIndex,
    gameOver,
    winner,
    lastMove: { col, row, stoneType, effect, randomValue: generatedRandomValue },
    mode: state.mode
  };

  return { state: newState, randomValue: generatedRandomValue };
}

function getWinner(players) {
  if (players[0].score > players[1].score) return 0;
  if (players[1].score > players[0].score) return 1;
  return 'tie';
}

export function isGameOver(state) {
  return state.gameOver;
}

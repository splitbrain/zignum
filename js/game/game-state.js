import { GRID_SIZE, LINE_ROW, LINE_COL } from '../model/constants.js';
import { createBoard } from '../model/board.js';

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

export function createGameStateFromData(data) {
  return {
    board: data.board,
    players: data.players,
    currentPlayer: data.currentPlayer,
    activeLineType: data.activeLineType,
    activeLineIndex: data.activeLineIndex,
    gameOver: data.gameOver || false,
    winner: data.winner || null,
    lastMove: data.lastMove || null,
    mode: data.mode
  };
}

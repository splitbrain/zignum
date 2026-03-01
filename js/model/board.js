import { GRID_SIZE, SPECIAL_COUNT, SPECIAL_TYPES } from './constants.js';
import { createStone, createSpecialStone, cloneStone } from './stone.js';

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

export function getStone(board, col, row) {
  return board[row * GRID_SIZE + col];
}

export function setStone(board, col, row, stone) {
  board[row * GRID_SIZE + col] = stone;
}

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

export function hasAvailableStones(board, lineType, lineIndex) {
  return getActiveLine(board, lineType, lineIndex).length > 0;
}

export function cloneBoard(board) {
  return board.map(s => cloneStone(s));
}

export function invertBoard(board) {
  for (const stone of board) {
    if (stone.type === 'normal' && !stone.picked) {
      stone.sign *= -1;
    }
  }
}

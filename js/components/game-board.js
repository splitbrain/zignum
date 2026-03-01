import { GRID_SIZE } from '../model/constants.js';
import { getStone } from '../model/board.js';
import './game-stone.js';

export class GameBoard extends HTMLElement {
  connectedCallback() {
    this.classList.add('game-board');
  }

  update(board, activeLineType, activeLineIndex) {
    this.innerHTML = '';
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const stone = getStone(board, col, row);
        const active = activeLineType === 'row'
          ? row === activeLineIndex
          : col === activeLineIndex;

        const el = document.createElement('game-stone');
        el.data = { stone, col, row, active };
        this.appendChild(el);
      }
    }
  }
}

customElements.define('game-board', GameBoard);

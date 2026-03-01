import { GRID_SIZE } from '../model/constants.js';
import { getStone } from '../model/board.js';
import './game-stone.js';

/**
 * 7x7 CSS Grid of {@link GameStone} elements. Recreates all child
 * elements on each update to reflect the current board state.
 * @class
 * @extends HTMLElement
 */
export class GameBoard extends HTMLElement {
  /**
   * Add the 'game-board' CSS class when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.classList.add('game-board');
  }

  /**
   * Rebuild the entire grid of game-stone elements from the current board state.
   * @param {import('../model/stone.js').Stone[]} board - Flat array of stones
   * @param {'row'|'col'} activeLineType - Orientation of the active line
   * @param {number} activeLineIndex - Index of the active row or column
   */
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

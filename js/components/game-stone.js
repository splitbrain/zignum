import { displayValue, isSpecial } from '../model/stone.js';

/**
 * Individual stone cell in the 7x7 grid. Displays its value, applies
 * CSS classes for styling (positive/negative/special/active/picked),
 * and dispatches 'stone-clicked' events on click.
 * @class
 * @extends HTMLElement
 */
export class GameStone extends HTMLElement {
  /** @type {import('../model/stone.js').Stone} */
  #stone;
  /** @type {number} Column index in the grid */
  #col;
  /** @type {number} Row index in the grid */
  #row;
  /** @type {boolean} Whether this stone is in the active line */
  #active;

  /**
   * Attach the click handler when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.addEventListener('click', this.#onClick.bind(this));
  }

  /**
   * Set stone data and trigger a re-render.
   * @param {Object} data
   * @param {import('../model/stone.js').Stone} data.stone - The stone model
   * @param {number} data.col - Column index
   * @param {number} data.row - Row index
   * @param {boolean} data.active - Whether the stone is in the active line
   */
  set data({ stone, col, row, active }) {
    this.#stone = stone;
    this.#col = col;
    this.#row = row;
    this.#active = active;
    this.#render();
  }

  /**
   * Update the element's CSS classes and text content to reflect the
   * current stone state (picked, active, positive/negative/special).
   */
  #render() {
    const stone = this.#stone;
    if (!stone) return;

    this.className = '';

    if (stone.picked) {
      this.classList.add('picked');
      this.textContent = '';
      return;
    }

    if (this.#active) {
      this.classList.add('active');
    }

    if (isSpecial(stone)) {
      this.classList.add('special');
    } else if (stone.sign > 0) {
      this.classList.add('positive');
    } else {
      this.classList.add('negative');
    }

    this.textContent = displayValue(stone);
  }

  /**
   * Handle click events. Dispatches a bubbling 'stone-clicked' custom event
   * with the stone's col and row, but only if the stone is unpicked and active.
   */
  #onClick() {
    if (!this.#stone || this.#stone.picked || !this.#active) return;
    this.dispatchEvent(new CustomEvent('stone-clicked', {
      bubbles: true,
      detail: { col: this.#col, row: this.#row }
    }));
  }
}

customElements.define('game-stone', GameStone);

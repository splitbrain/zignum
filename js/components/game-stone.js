import { displayValue, isSpecial } from '../model/stone.js';

export class GameStone extends HTMLElement {
  #stone;
  #col;
  #row;
  #active;

  connectedCallback() {
    this.addEventListener('click', this.#onClick.bind(this));
  }

  set data({ stone, col, row, active }) {
    this.#stone = stone;
    this.#col = col;
    this.#row = row;
    this.#active = active;
    this.#render();
  }

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

  #onClick() {
    if (!this.#stone || this.#stone.picked || !this.#active) return;
    this.dispatchEvent(new CustomEvent('stone-clicked', {
      bubbles: true,
      detail: { col: this.#col, row: this.#row }
    }));
  }
}

customElements.define('game-stone', GameStone);

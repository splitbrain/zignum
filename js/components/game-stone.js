import { displayValue, isSpecial } from '../model/stone.js';

export class GameStone extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this._onClick.bind(this));
  }

  set data({ stone, col, row, active }) {
    this._stone = stone;
    this._col = col;
    this._row = row;
    this._active = active;
    this._render();
  }

  _render() {
    const stone = this._stone;
    if (!stone) return;

    this.className = '';

    if (stone.picked) {
      this.classList.add('picked');
      this.textContent = '';
      return;
    }

    if (this._active) {
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

  _onClick() {
    if (!this._stone || this._stone.picked || !this._active) return;
    this.dispatchEvent(new CustomEvent('stone-clicked', {
      bubbles: true,
      detail: { col: this._col, row: this._row }
    }));
  }
}

customElements.define('game-stone', GameStone);

/**
 * Main menu screen with mode selection buttons (Solo Play, Hot Seat,
 * Network Play) and a "How to Play" link. Dispatches a 'mode-selected'
 * event when a game mode button is clicked, and a 'show-how-to-play'
 * event when the how-to-play button is clicked.
 * @class
 * @extends HTMLElement
 */
export class MainMenu extends HTMLElement {
  /**
   * Render the menu buttons and attach a delegated click handler
   * that dispatches 'mode-selected' with the chosen mode.
   */
  connectedCallback() {
    this.classList.add('main-menu');
    this.innerHTML = `
      <button data-mode="solo">Solo Play</button>
      <button data-mode="hotseat">Hot Seat</button>
      <button data-mode="network">Network Play</button>
      <button class="how-to-play-btn" id="how-to-play-btn">How to Play</button>
    `;

    this.addEventListener('click', (e) => {
      if (e.target.id === 'how-to-play-btn') {
        this.dispatchEvent(new CustomEvent('show-how-to-play', { bubbles: true }));
        return;
      }
      const mode = e.target.dataset.mode;
      if (mode) {
        this.dispatchEvent(new CustomEvent('mode-selected', {
          bubbles: true,
          detail: { mode }
        }));
      }
    });
  }
}

customElements.define('main-menu', MainMenu);

export class MainMenu extends HTMLElement {
  connectedCallback() {
    this.classList.add('main-menu');
    this.innerHTML = `
      <h1>ZNum</h1>
      <button data-mode="solo">Solo Play</button>
      <button data-mode="hotseat">Hot Seat</button>
      <button data-mode="network">Network Play</button>
    `;

    this.addEventListener('click', (e) => {
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

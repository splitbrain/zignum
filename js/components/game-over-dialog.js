/**
 * Game-over dialog displaying the winner, scores, and action buttons.
 * Uses the native <dialog> element with showModal() for proper accessibility.
 * In network mode an additional "Rematch" button is shown.
 * @class
 * @extends HTMLElement
 */
export class GameOverDialog extends HTMLElement {
  /** @type {import('../model/player.js').Player[]} */
  #players;
  /** @type {number|'tie'|null} */
  #winner;
  /** @type {string} */
  #mode;

  /**
   * Display the game-over dialog with results and action buttons.
   * @param {import('../model/player.js').Player[]} players - Both players
   * @param {number|'tie'} winner - Index of the winner or 'tie'
   * @param {string} mode - Current game mode
   */
  show(players, winner, mode) {
    this.#players = players;
    this.#winner = winner;
    this.#mode = mode;
    this.#render();
  }

  /**
   * Build the dialog HTML with result text, scores, and buttons.
   * Wires click handlers for "New Game", "Back to Menu", and optionally "Rematch".
   */
  #render() {
    const players = this.#players;
    const winner = this.#winner;
    const mode = this.#mode;

    let resultText;
    if (winner === 'tie') {
      resultText = "It's a tie!";
    } else {
      resultText = `${players[winner].name} wins!`;
    }

    const scoreText = `${players[0].name}: ${players[0].score} | ${players[1].name}: ${players[1].score}`;

    let buttons = '<button id="new-game-btn">New Game</button><button id="menu-btn">Back to Menu</button>';
    if (mode === 'network') {
      buttons = '<button id="rematch-btn">Rematch</button>' + buttons;
    }

    this.innerHTML = `
      <dialog class="game-over-dialog">
        <h2>${resultText}</h2>
        <p>${scoreText}</p>
        ${buttons}
      </dialog>
    `;

    const dialog = this.querySelector('dialog');
    dialog.showModal();

    this.querySelector('#new-game-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('new-game', { bubbles: true }));
    });

    this.querySelector('#menu-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });

    this.querySelector('#rematch-btn')?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('rematch-request', { bubbles: true }));
    });
  }

  /**
   * Show a "Waiting for opponent..." status after the local player requests a rematch.
   */
  showRematchRequested() {
    const dialog = this.querySelector('.game-over-dialog');
    if (dialog) {
      const existing = dialog.querySelector('.rematch-status');
      if (existing) existing.remove();
      const p = document.createElement('p');
      p.className = 'rematch-status';
      p.textContent = 'Waiting for opponent...';
      dialog.appendChild(p);
    }
  }

  /**
   * Show a rematch offer with an "Accept" button when the remote player requests a rematch.
   */
  showRematchOffer() {
    const dialog = this.querySelector('.game-over-dialog');
    if (dialog) {
      const existing = dialog.querySelector('.rematch-status');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.className = 'rematch-status';
      div.innerHTML = '<p>Opponent wants a rematch!</p><button id="accept-rematch-btn">Accept</button>';
      dialog.appendChild(div);

      div.querySelector('#accept-rematch-btn').addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('rematch-accept', { bubbles: true }));
      });
    }
  }

  /**
   * Hide the dialog by closing it and clearing all inner HTML.
   */
  hide() {
    const dialog = this.querySelector('dialog');
    if (dialog?.open) dialog.close();
    this.innerHTML = '';
  }
}

customElements.define('game-over-dialog', GameOverDialog);

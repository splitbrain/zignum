import { loadPlayerName, savePlayerName } from '../utils/storage.js';

/**
 * Player name input form. Shows one or two name fields depending on
 * the game mode, then dispatches a 'players-ready' event with the
 * entered names.
 * @class
 * @extends HTMLElement
 */
export class PlayerSetup extends HTMLElement {
  /** @type {string} Current game mode */
  #mode;
  /** @type {string|null} Host peer ID when joining a network game */
  #joinId = null;
  /** @type {boolean} Whether the player is joining an existing network game */
  #isJoining = false;

  /**
   * Set the game mode and trigger a re-render of the form.
   * @param {string} value - Game mode ('solo', 'hotseat', 'network')
   */
  set mode(value) {
    this.#mode = value;
    this.#render();
  }

  /**
   * Set the host peer ID for joining a network game.
   * @param {string|null} value - The peer ID, or null
   */
  set joinId(value) {
    this.#joinId = value;
  }

  /**
   * Set whether this setup is for joining an existing game.
   * @param {boolean} value
   */
  set isJoining(value) {
    this.#isJoining = value;
  }

  /**
   * Build the form HTML with name input(s) and a "Start Game" button.
   * Loads previously saved names from localStorage as defaults.
   * On submit, saves names and dispatches 'players-ready'.
   */
  #render() {
    this.classList.add('player-setup');
    const mode = this.#mode;
    const name1 = loadPlayerName(0) || 'Player 1';
    const name2 = loadPlayerName(1) || 'Player 2';

    const isNetwork = mode === 'network';
    let html = '<h2>Player Setup</h2>';
    html += '<form id="setup-form">';
    html += `
      <div class="input-group">
        <label for="p1-name">${mode === 'solo' || isNetwork ? 'Your Name' : 'Player 1'}</label>
        <input id="p1-name" type="text" value="${name1}" maxlength="20" autofocus>
      </div>
    `;

    if (mode === 'hotseat') {
      html += `
        <div class="input-group">
          <label for="p2-name">Player 2</label>
          <input id="p2-name" type="text" value="${name2}" maxlength="20">
        </div>
      `;
    }

    html += '<button type="submit" id="start-btn">Start Game</button>';
    html += '</form>';
    this.innerHTML = html;

    this.querySelector('#setup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const p1Name = this.querySelector('#p1-name').value.trim() || 'Player 1';
      savePlayerName(p1Name, 0);

      let p2Name;
      if (mode === 'hotseat') {
        p2Name = this.querySelector('#p2-name').value.trim() || 'Player 2';
        savePlayerName(p2Name, 1);
      } else if (mode === 'solo') {
        p2Name = 'Computer';
      } else {
        p2Name = 'Opponent';
      }

      this.dispatchEvent(new CustomEvent('players-ready', {
        bubbles: true,
        detail: { player1Name: p1Name, player2Name: p2Name, joinId: this.#joinId || null }
      }));
    });
  }
}

customElements.define('player-setup', PlayerSetup);

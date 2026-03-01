import { loadPlayerName, savePlayerName } from '../utils/storage.js';

export class PlayerSetup extends HTMLElement {
  #mode;
  #joinId = null;
  #isJoining = false;

  set mode(value) {
    this.#mode = value;
    this.#render();
  }

  set joinId(value) {
    this.#joinId = value;
  }

  set isJoining(value) {
    this.#isJoining = value;
  }

  #render() {
    this.classList.add('player-setup');
    const mode = this.#mode;
    const name1 = loadPlayerName(0) || 'Player 1';
    const name2 = loadPlayerName(1) || 'Player 2';

    const isNetwork = mode === 'network';
    let html = '<h2>Player Setup</h2>';
    html += `
      <div class="input-group">
        <label for="p1-name">${mode === 'solo' || isNetwork ? 'Your Name' : 'Player 1'}</label>
        <input id="p1-name" type="text" value="${name1}" maxlength="20">
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

    html += '<button id="start-btn">Start Game</button>';
    this.innerHTML = html;

    this.querySelector('#start-btn').addEventListener('click', () => {
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

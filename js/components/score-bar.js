/**
 * Horizontal bar displaying both players' names and scores, with a
 * visual highlight on the current player's side.
 * @class
 * @extends HTMLElement
 */
export class ScoreBar extends HTMLElement {
  /**
   * Add the 'score-bar' CSS class when the element is inserted into the DOM.
   */
  connectedCallback() {
    this.classList.add('score-bar');
  }

  /**
   * Re-render the score bar with updated player info and turn indicator.
   * @param {import('../model/player.js').Player[]} players - Both players
   * @param {number} currentPlayer - Index (0 or 1) of the active player
   * @param {boolean} gameOver - Whether the game has ended (suppresses highlight)
   */
  update(players, currentPlayer, gameOver) {
    this.innerHTML = `
      <div class="player-score ${currentPlayer === 0 && !gameOver ? 'current' : ''}">
        <span class="player-name">${players[0].name}</span>
        <span class="player-score-value">${players[0].score}</span>
      </div>
      <div class="player-score ${currentPlayer === 1 && !gameOver ? 'current' : ''}">
        <span class="player-name">${players[1].name}</span>
        <span class="player-score-value">${players[1].score}</span>
      </div>
    `;
  }
}

customElements.define('score-bar', ScoreBar);

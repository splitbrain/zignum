export class ScoreBar extends HTMLElement {
  connectedCallback() {
    this.classList.add('score-bar');
  }

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

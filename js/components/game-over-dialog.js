export class GameOverDialog extends HTMLElement {
  show(players, winner, mode) {
    this._players = players;
    this._winner = winner;
    this._mode = mode;
    this._render();
  }

  _render() {
    const { _players: players, _winner: winner, _mode: mode } = this;

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
      <div class="game-over-overlay">
        <div class="game-over-dialog">
          <h2>${resultText}</h2>
          <p>${scoreText}</p>
          ${buttons}
        </div>
      </div>
    `;

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

  hide() {
    this.innerHTML = '';
  }
}

customElements.define('game-over-dialog', GameOverDialog);

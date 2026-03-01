import { createGameState } from '../game/game-state.js';
import { pickStone, getAvailableMoves, isValidMove } from '../game/game-logic.js';
import { createPlayer } from '../model/player.js';
import './game-board.js';
import './score-bar.js';
import './game-over-dialog.js';

export class GameScreen extends HTMLElement {
  connectedCallback() {
    this._scoreBar = document.createElement('score-bar');
    this._statusMsg = document.createElement('div');
    this._statusMsg.className = 'status-message';
    this._board = document.createElement('game-board');
    this._gameOverDialog = document.createElement('game-over-dialog');

    this.appendChild(this._scoreBar);
    this.appendChild(this._statusMsg);
    this.appendChild(this._board);
    this.appendChild(this._gameOverDialog);

    this.addEventListener('stone-clicked', (e) => {
      this._onStoneClicked(e.detail.col, e.detail.row);
    });
  }

  startGame(player1Name, player2Name, mode, options = {}) {
    this._mode = mode;
    this._options = options;
    this._aiThinking = false;

    const p1 = createPlayer(player1Name, false);
    const p2 = createPlayer(player2Name, mode === 'solo');

    this._state = createGameState(p1, p2, mode);
    this._localPlayer = options.localPlayer ?? null; // for network mode
    this._render();
    this._updateStatus();

    // If AI goes first in solo mode
    if (mode === 'solo' && this._state.players[this._state.currentPlayer].isAI) {
      this._scheduleAIMove();
    }
  }

  setState(state) {
    this._state = state;
    this._render();
    this._updateStatus();
  }

  getState() {
    return this._state;
  }

  _render() {
    const s = this._state;
    this._scoreBar.update(s.players, s.currentPlayer, s.gameOver);
    this._board.update(s.board, s.activeLineType, s.activeLineIndex);

    if (s.gameOver) {
      this._gameOverDialog.show(s.players, s.winner, s.mode);
    } else {
      this._gameOverDialog.hide();
    }
  }

  _updateStatus() {
    const s = this._state;
    if (s.gameOver) {
      this._statusMsg.textContent = '';
      return;
    }

    const player = s.players[s.currentPlayer];
    let msg = `${player.name}'s turn`;

    if (s.lastMove) {
      const { effect, randomValue } = s.lastMove;
      if (effect === 'invert') {
        msg = `All values inverted! ${msg}`;
      } else if (effect === 'random') {
        const sign = randomValue > 0 ? '+' : '';
        msg = `Random: ${sign}${randomValue}! ${msg}`;
      } else if (effect === 'skip') {
        msg = `Turn skipped! ${msg}`;
      }
    }

    this._statusMsg.textContent = msg;
  }

  _onStoneClicked(col, row) {
    const s = this._state;
    if (s.gameOver) return;
    if (this._aiThinking) return;

    // In network mode, only allow clicks when it's local player's turn
    if (this._mode === 'network' && this._localPlayer !== null && s.currentPlayer !== this._localPlayer) {
      return;
    }

    if (!isValidMove(s, col, row)) return;

    const result = pickStone(s, col, row);
    this._state = result.state;
    this._render();
    this._updateStatus();

    // In network mode, send move to peer
    if (this._mode === 'network') {
      this.dispatchEvent(new CustomEvent('local-move', {
        bubbles: true,
        detail: { col, row, randomValue: result.randomValue }
      }));
    }

    // In solo mode, schedule AI move
    if (this._mode === 'solo' && !this._state.gameOver && this._state.players[this._state.currentPlayer].isAI) {
      this._scheduleAIMove();
    }
  }

  applyRemoteMove(col, row, randomValue) {
    const s = this._state;
    if (s.gameOver) return;
    if (!isValidMove(s, col, row)) {
      console.error('Invalid remote move:', col, row);
      return;
    }

    const result = pickStone(s, col, row, randomValue);
    this._state = result.state;
    this._render();
    this._updateStatus();
  }

  async _scheduleAIMove() {
    this._aiThinking = true;
    this._statusMsg.textContent = `${this._state.players[this._state.currentPlayer].name} is thinking...`;

    // Small delay so the UI updates before AI computation
    await new Promise(r => setTimeout(r, 400));

    const { findBestMove } = await import('../game/ai.js');

    while (!this._state.gameOver && this._state.players[this._state.currentPlayer].isAI) {
      const move = findBestMove(this._state);
      if (!move) break;

      const result = pickStone(this._state, move.col, move.row);
      this._state = result.state;
      this._render();
      this._updateStatus();

      // Brief pause between consecutive AI moves (e.g., after skip)
      if (!this._state.gameOver && this._state.players[this._state.currentPlayer].isAI) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    this._aiThinking = false;
  }
}

customElements.define('game-screen', GameScreen);

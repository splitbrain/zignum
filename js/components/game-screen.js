import { createGameState } from '../game/game-state.js';
import { pickStone, getAvailableMoves, isValidMove } from '../game/game-logic.js';
import { createPlayer } from '../model/player.js';
import './game-board.js';
import './score-bar.js';
import './game-over-dialog.js';

export class GameScreen extends HTMLElement {
  #scoreBar;
  #statusMsg;
  #board;
  #gameOverDialog;
  #state;
  #mode;
  #options;
  #aiThinking = false;
  #localPlayer = null;

  connectedCallback() {
    this.#scoreBar = document.createElement('score-bar');
    this.#statusMsg = document.createElement('div');
    this.#statusMsg.className = 'status-message';
    this.#board = document.createElement('game-board');
    this.#gameOverDialog = document.createElement('game-over-dialog');

    this.appendChild(this.#scoreBar);
    this.appendChild(this.#statusMsg);
    this.appendChild(this.#board);
    this.appendChild(this.#gameOverDialog);

    this.addEventListener('stone-clicked', (e) => {
      this.#onStoneClicked(e.detail.col, e.detail.row);
    });
  }

  startGame(player1Name, player2Name, mode, options = {}) {
    this.#mode = mode;
    this.#options = options;
    this.#aiThinking = false;

    const p1 = createPlayer(player1Name, false);
    const p2 = createPlayer(player2Name, mode === 'solo');

    this.#state = createGameState(p1, p2, mode);
    this.#localPlayer = options.localPlayer ?? null; // for network mode
    this.#render();
    this.#updateStatus();

    // If AI goes first in solo mode
    if (mode === 'solo' && this.#state.players[this.#state.currentPlayer].isAI) {
      this.#scheduleAIMove();
    }
  }

  setState(state) {
    this.#state = state;
    this.#render();
    this.#updateStatus();
  }

  getState() {
    return this.#state;
  }

  #render() {
    const s = this.#state;
    this.#scoreBar.update(s.players, s.currentPlayer, s.gameOver);
    this.#board.update(s.board, s.activeLineType, s.activeLineIndex);

    if (s.gameOver) {
      this.#gameOverDialog.show(s.players, s.winner, s.mode);
    } else {
      this.#gameOverDialog.hide();
    }
  }

  #updateStatus() {
    const s = this.#state;
    if (s.gameOver) {
      this.#statusMsg.textContent = '';
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

    this.#statusMsg.textContent = msg;
  }

  #onStoneClicked(col, row) {
    const s = this.#state;
    if (s.gameOver) return;
    if (this.#aiThinking) return;

    // In network mode, only allow clicks when it's local player's turn
    if (this.#mode === 'network' && this.#localPlayer !== null && s.currentPlayer !== this.#localPlayer) {
      return;
    }

    if (!isValidMove(s, col, row)) return;

    const result = pickStone(s, col, row);
    this.#state = result.state;
    this.#render();
    this.#updateStatus();

    // In network mode, send move to peer
    if (this.#mode === 'network') {
      this.dispatchEvent(new CustomEvent('local-move', {
        bubbles: true,
        detail: { col, row, randomValue: result.randomValue }
      }));
    }

    // In solo mode, schedule AI move
    if (this.#mode === 'solo' && !this.#state.gameOver && this.#state.players[this.#state.currentPlayer].isAI) {
      this.#scheduleAIMove();
    }
  }

  applyRemoteMove(col, row, randomValue) {
    const s = this.#state;
    if (s.gameOver) return;
    if (!isValidMove(s, col, row)) {
      console.error('Invalid remote move:', col, row);
      return;
    }

    const result = pickStone(s, col, row, randomValue);
    this.#state = result.state;
    this.#render();
    this.#updateStatus();
  }

  async #scheduleAIMove() {
    this.#aiThinking = true;
    this.#statusMsg.textContent = `${this.#state.players[this.#state.currentPlayer].name} is thinking...`;

    // Small delay so the UI updates before AI computation
    await new Promise(r => setTimeout(r, 400));

    const { findBestMove } = await import('../game/ai.js');

    while (!this.#state.gameOver && this.#state.players[this.#state.currentPlayer].isAI) {
      const move = findBestMove(this.#state);
      if (!move) break;

      const result = pickStone(this.#state, move.col, move.row);
      this.#state = result.state;
      this.#render();
      this.#updateStatus();

      // Brief pause between consecutive AI moves (e.g., after skip)
      if (!this.#state.gameOver && this.#state.players[this.#state.currentPlayer].isAI) {
        await new Promise(r => setTimeout(r, 400));
      }
    }

    this.#aiThinking = false;
  }
}

customElements.define('game-screen', GameScreen);

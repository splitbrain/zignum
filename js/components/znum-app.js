import './main-menu.js';
import './player-setup.js';
import './game-screen.js';
import './network-lobby.js';
import { PeerManager } from '../network/peer-manager.js';
import { createGameState } from '../game/game-state.js';
import { createPlayer } from '../model/player.js';

export class ZnumApp extends HTMLElement {
  #peerManager = null;
  #mode = null;
  #localPlayerName = null;
  #remotePlayerName = null;
  #localPlayerIndex = null;
  #gameScreen = null;
  #currentP1 = null;
  #currentP2 = null;

  connectedCallback() {
    // Check if joining a game via URL
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');

    if (joinId) {
      this.#mode = 'network';
      this.#showPlayerSetup(true, joinId);
    } else {
      this.#showMenu();
    }

    this.addEventListener('mode-selected', (e) => {
      this.#mode = e.detail.mode;
      this.#showPlayerSetup(false);
    });

    this.addEventListener('players-ready', (e) => {
      const { player1Name, player2Name, joinId } = e.detail;
      this.#localPlayerName = player1Name;

      if (this.#mode === 'network') {
        if (joinId) {
          this.#joinNetworkGame(player1Name, joinId);
        } else {
          this.#hostNetworkGame(player1Name);
        }
      } else {
        this.#showGame(player1Name, player2Name, this.#mode);
      }
    });

    this.addEventListener('new-game', () => {
      if (this.#mode === 'network' && this.#peerManager) {
        // In network mode, new game acts like rematch
        return;
      }
      if (this.#currentP1 && this.#currentP2) {
        this.#showGame(this.#currentP1, this.#currentP2, this.#mode);
      } else {
        this.#showMenu();
      }
    });

    this.addEventListener('back-to-menu', () => {
      this.#cleanup();
      this.#showMenu();
    });

    this.addEventListener('local-move', (e) => {
      if (this.#peerManager) {
        const { col, row, randomValue } = e.detail;
        const msg = { type: 'move', col, row };
        if (randomValue !== null && randomValue !== undefined) {
          msg.randomValue = randomValue;
        }
        this.#peerManager.send(msg);
      }
    });

    this.addEventListener('rematch-request', () => {
      if (this.#peerManager) {
        this.#peerManager.send({ type: 'rematch-request' });
        if (this.#gameScreen) {
          const dialog = this.#gameScreen.querySelector('game-over-dialog');
          if (dialog) dialog.showRematchRequested();
        }
      }
    });

    this.addEventListener('rematch-accept', () => {
      if (this.#peerManager) {
        this.#peerManager.send({ type: 'rematch-accept' });
        // If we're the host, start the new game
        if (this.#peerManager.isHost) {
          this.#startNetworkGame();
        }
      }
    });
  }

  #showMenu() {
    this.innerHTML = '';
    const menu = document.createElement('main-menu');
    this.appendChild(menu);
  }

  #showPlayerSetup(isJoining = false, joinId = null) {
    this.innerHTML = '';
    const setup = document.createElement('player-setup');
    this.appendChild(setup);
    setup.mode = this.#mode;
    setup.joinId = joinId;
    setup.isJoining = isJoining;
  }

  #showGame(player1Name, player2Name, mode, options = {}) {
    this.#currentP1 = player1Name;
    this.#currentP2 = player2Name;
    this.innerHTML = '';
    const screen = document.createElement('game-screen');
    this.#gameScreen = screen;
    this.appendChild(screen);
    screen.startGame(player1Name, player2Name, mode, options);
  }

  async #hostNetworkGame(localName) {
    this.#cleanup();
    this.#peerManager = new PeerManager();
    this.#localPlayerName = localName;

    this.innerHTML = '';
    const lobby = document.createElement('network-lobby');
    this.appendChild(lobby);

    try {
      const peerId = await this.#peerManager.createGame();
      lobby.showHost(peerId);

      this.#peerManager.onConnected(() => {
        // Wait for guest to send player-info
      });

      this.#peerManager.onMessage((msg) => {
        this.#handleNetworkMessage(msg);
      });

      this.#peerManager.onDisconnected(() => {
        this.#showDisconnectOverlay();
      });
    } catch (err) {
      lobby.showError(err.message || 'Failed to create game');
    }
  }

  async #joinNetworkGame(localName, peerId) {
    this.#cleanup();
    this.#peerManager = new PeerManager();
    this.#localPlayerName = localName;

    this.innerHTML = '';
    const lobby = document.createElement('network-lobby');
    this.appendChild(lobby);
    lobby.showJoining();

    try {
      await this.#peerManager.joinGame(peerId);

      this.#peerManager.onConnected(() => {
        // Send our name to host
        this.#peerManager.send({ type: 'player-info', name: localName });
      });

      this.#peerManager.onMessage((msg) => {
        this.#handleNetworkMessage(msg);
      });

      this.#peerManager.onDisconnected(() => {
        this.#showDisconnectOverlay();
      });
    } catch (err) {
      lobby.showError(err.message || 'Failed to join game');
    }
  }

  #handleNetworkMessage(msg) {
    switch (msg.type) {
      case 'player-info':
        // Host receives guest's name
        this.#remotePlayerName = msg.name;
        this.#startNetworkGame();
        break;

      case 'game-start': {
        // Guest receives game state from host
        this.#localPlayerIndex = msg.guestPlayer;
        this.#remotePlayerName = msg.hostName;
        const p1Name = msg.players[0];
        const p2Name = msg.players[1];
        this.#showGame(p1Name, p2Name, 'network', {
          localPlayer: this.#localPlayerIndex
        });
        // Apply the board from host
        this.#gameScreen.setState({
          board: msg.board,
          players: [
            { name: p1Name, score: 0, isAI: false },
            { name: p2Name, score: 0, isAI: false }
          ],
          currentPlayer: msg.startingPlayer,
          activeLineType: msg.activeLineType,
          activeLineIndex: msg.activeLineIndex,
          gameOver: false,
          winner: null,
          lastMove: null,
          mode: 'network'
        });
        break;
      }

      case 'move':
        // Remote player made a move
        if (this.#gameScreen) {
          this.#gameScreen.applyRemoteMove(msg.col, msg.row, msg.randomValue);
        }
        break;

      case 'rematch-request':
        if (this.#gameScreen) {
          const dialog = this.#gameScreen.querySelector('game-over-dialog');
          if (dialog) dialog.showRematchOffer();
        }
        break;

      case 'rematch-accept':
        // If we're the host, start new game
        if (this.#peerManager.isHost) {
          this.#startNetworkGame();
        }
        break;
    }
  }

  #startNetworkGame() {
    // Host generates the game state and sends it to guest
    const hostName = this.#localPlayerName;
    const guestName = this.#remotePlayerName || 'Opponent';

    // Randomly assign player indices
    const hostPlayer = Math.random() < 0.5 ? 0 : 1;
    const guestPlayer = 1 - hostPlayer;
    this.#localPlayerIndex = hostPlayer;

    const p1 = createPlayer(hostPlayer === 0 ? hostName : guestName);
    const p2 = createPlayer(hostPlayer === 0 ? guestName : hostName);
    const state = createGameState(p1, p2, 'network');

    // Send game state to guest
    this.#peerManager.send({
      type: 'game-start',
      board: state.board,
      activeLineType: state.activeLineType,
      activeLineIndex: state.activeLineIndex,
      startingPlayer: state.currentPlayer,
      hostName: hostName,
      guestPlayer: guestPlayer,
      players: [p1.name, p2.name]
    });

    // Show game locally
    this.#showGame(p1.name, p2.name, 'network', {
      localPlayer: hostPlayer
    });
    this.#gameScreen.setState(state);
  }

  #showDisconnectOverlay() {
    // Remove existing overlay
    this.#hideDisconnectOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'disconnect-overlay';
    overlay.id = 'disconnect-overlay';
    overlay.textContent = 'Opponent disconnected. Waiting for reconnection...';
    document.body.appendChild(overlay);
  }

  #hideDisconnectOverlay() {
    const existing = document.getElementById('disconnect-overlay');
    if (existing) existing.remove();
  }

  #cleanup() {
    this.#hideDisconnectOverlay();
    if (this.#peerManager) {
      this.#peerManager.destroy();
      this.#peerManager = null;
    }
    this.#gameScreen = null;
    // Clean URL params
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

customElements.define('znum-app', ZnumApp);

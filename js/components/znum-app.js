import './main-menu.js';
import './player-setup.js';
import './game-screen.js';
import './network-lobby.js';
import { PeerManager } from '../network/peer-manager.js';
import { createGameState } from '../game/game-state.js';
import { createPlayer } from '../model/player.js';

export class ZnumApp extends HTMLElement {
  connectedCallback() {
    this._peerManager = null;
    this._mode = null;
    this._localPlayerName = null;
    this._remotePlayerName = null;
    this._localPlayerIndex = null;
    this._gameScreen = null;

    // Check if joining a game via URL
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');

    if (joinId) {
      this._mode = 'network';
      this._showPlayerSetup(true, joinId);
    } else {
      this._showMenu();
    }

    this.addEventListener('mode-selected', (e) => {
      this._mode = e.detail.mode;
      this._showPlayerSetup(false);
    });

    this.addEventListener('players-ready', (e) => {
      const { player1Name, player2Name, joinId } = e.detail;
      this._localPlayerName = player1Name;

      if (this._mode === 'network') {
        if (joinId) {
          this._joinNetworkGame(player1Name, joinId);
        } else {
          this._hostNetworkGame(player1Name);
        }
      } else {
        this._showGame(player1Name, player2Name, this._mode);
      }
    });

    this.addEventListener('new-game', () => {
      if (this._mode === 'network' && this._peerManager) {
        // In network mode, new game acts like rematch
        return;
      }
      if (this._currentP1 && this._currentP2) {
        this._showGame(this._currentP1, this._currentP2, this._mode);
      } else {
        this._showMenu();
      }
    });

    this.addEventListener('back-to-menu', () => {
      this._cleanup();
      this._showMenu();
    });

    this.addEventListener('local-move', (e) => {
      if (this._peerManager) {
        const { col, row, randomValue } = e.detail;
        const msg = { type: 'move', col, row };
        if (randomValue !== null && randomValue !== undefined) {
          msg.randomValue = randomValue;
        }
        this._peerManager.send(msg);
      }
    });

    this.addEventListener('rematch-request', () => {
      if (this._peerManager) {
        this._peerManager.send({ type: 'rematch-request' });
        if (this._gameScreen) {
          const dialog = this._gameScreen.querySelector('game-over-dialog');
          if (dialog) dialog.showRematchRequested();
        }
      }
    });

    this.addEventListener('rematch-accept', () => {
      if (this._peerManager) {
        this._peerManager.send({ type: 'rematch-accept' });
        // If we're the host, start the new game
        if (this._peerManager.isHost) {
          this._startNetworkGame();
        }
      }
    });
  }

  _showMenu() {
    this.innerHTML = '';
    const menu = document.createElement('main-menu');
    this.appendChild(menu);
  }

  _showPlayerSetup(isJoining = false, joinId = null) {
    this.innerHTML = '';
    const setup = document.createElement('player-setup');
    this.appendChild(setup);
    setup.mode = this._mode;
    setup._joinId = joinId;
    setup._isJoining = isJoining;
  }

  _showGame(player1Name, player2Name, mode, options = {}) {
    this._currentP1 = player1Name;
    this._currentP2 = player2Name;
    this.innerHTML = '';
    const screen = document.createElement('game-screen');
    this._gameScreen = screen;
    this.appendChild(screen);
    screen.startGame(player1Name, player2Name, mode, options);
  }

  async _hostNetworkGame(localName) {
    this._cleanup();
    this._peerManager = new PeerManager();
    this._localPlayerName = localName;

    this.innerHTML = '';
    const lobby = document.createElement('network-lobby');
    this.appendChild(lobby);

    try {
      const peerId = await this._peerManager.createGame();
      lobby.showHost(peerId);

      this._peerManager.onConnected(() => {
        // Wait for guest to send player-info
      });

      this._peerManager.onMessage((msg) => {
        this._handleNetworkMessage(msg);
      });

      this._peerManager.onDisconnected(() => {
        this._showDisconnectOverlay();
      });
    } catch (err) {
      lobby.showError(err.message || 'Failed to create game');
    }
  }

  async _joinNetworkGame(localName, peerId) {
    this._cleanup();
    this._peerManager = new PeerManager();
    this._localPlayerName = localName;

    this.innerHTML = '';
    const lobby = document.createElement('network-lobby');
    this.appendChild(lobby);
    lobby.showJoining();

    try {
      await this._peerManager.joinGame(peerId);

      this._peerManager.onConnected(() => {
        // Send our name to host
        this._peerManager.send({ type: 'player-info', name: localName });
      });

      this._peerManager.onMessage((msg) => {
        this._handleNetworkMessage(msg);
      });

      this._peerManager.onDisconnected(() => {
        this._showDisconnectOverlay();
      });
    } catch (err) {
      lobby.showError(err.message || 'Failed to join game');
    }
  }

  _handleNetworkMessage(msg) {
    switch (msg.type) {
      case 'player-info':
        // Host receives guest's name
        this._remotePlayerName = msg.name;
        this._startNetworkGame();
        break;

      case 'game-start':
        // Guest receives game state from host
        this._localPlayerIndex = msg.guestPlayer;
        this._remotePlayerName = msg.hostName;
        const p1Name = msg.players[0];
        const p2Name = msg.players[1];
        this._showGame(p1Name, p2Name, 'network', {
          localPlayer: this._localPlayerIndex
        });
        // Apply the board from host
        this._gameScreen.setState({
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

      case 'move':
        // Remote player made a move
        if (this._gameScreen) {
          this._gameScreen.applyRemoteMove(msg.col, msg.row, msg.randomValue);
        }
        break;

      case 'rematch-request':
        if (this._gameScreen) {
          const dialog = this._gameScreen.querySelector('game-over-dialog');
          if (dialog) dialog.showRematchOffer();
        }
        break;

      case 'rematch-accept':
        // If we're the host, start new game
        if (this._peerManager.isHost) {
          this._startNetworkGame();
        }
        break;
    }
  }

  _startNetworkGame() {
    // Host generates the game state and sends it to guest
    const hostName = this._localPlayerName;
    const guestName = this._remotePlayerName || 'Opponent';

    // Randomly assign player indices
    const hostPlayer = Math.random() < 0.5 ? 0 : 1;
    const guestPlayer = 1 - hostPlayer;
    this._localPlayerIndex = hostPlayer;

    const p1 = createPlayer(hostPlayer === 0 ? hostName : guestName);
    const p2 = createPlayer(hostPlayer === 0 ? guestName : hostName);
    const state = createGameState(p1, p2, 'network');

    // Send game state to guest
    this._peerManager.send({
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
    this._showGame(p1.name, p2.name, 'network', {
      localPlayer: hostPlayer
    });
    this._gameScreen.setState(state);
  }

  _showDisconnectOverlay() {
    // Remove existing overlay
    this._hideDisconnectOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'disconnect-overlay';
    overlay.id = 'disconnect-overlay';
    overlay.textContent = 'Opponent disconnected. Waiting for reconnection...';
    document.body.appendChild(overlay);
  }

  _hideDisconnectOverlay() {
    const existing = document.getElementById('disconnect-overlay');
    if (existing) existing.remove();
  }

  _cleanup() {
    this._hideDisconnectOverlay();
    if (this._peerManager) {
      this._peerManager.destroy();
      this._peerManager = null;
    }
    this._gameScreen = null;
    // Clean URL params
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

customElements.define('znum-app', ZnumApp);

import './main-menu.js';
import './player-setup.js';
import './game-screen.js';
import './network-lobby.js';
import './how-to-play.js';
import { PeerManager } from '../network/peer-manager.js';
import { createGameState } from '../game/game-state.js';
import { createPlayer } from '../model/player.js';

/**
 * Top-level application shell. Routes between main menu, player setup,
 * network lobby, and game screen. Orchestrates all network communication
 * through PeerManager. Displays a persistent header with the game logo
 * that navigates back to the main menu when clicked.
 * @class
 * @extends HTMLElement
 */
export class ZnumApp extends HTMLElement {
  /** @type {PeerManager|null} */
  #peerManager = null;
  /** @type {string|null} Current game mode */
  #mode = null;
  /** @type {string|null} Local player's display name */
  #localPlayerName = null;
  /** @type {string|null} Remote player's display name */
  #remotePlayerName = null;
  /** @type {number|null} Local player index (0 or 1) in network mode */
  #localPlayerIndex = null;
  /** @type {GameScreen|null} Reference to the active game screen element */
  #gameScreen = null;
  /** @type {string|null} Cached player 1 name for "New Game" */
  #currentP1 = null;
  /** @type {string|null} Cached player 2 name for "New Game" */
  #currentP2 = null;
  /** @type {HTMLElement} Persistent header element */
  #header;
  /** @type {HTMLElement} Content container for screen swapping */
  #content;
  /** @type {Function} Bound beforeunload handler reference for removal */
  #beforeUnloadHandler;

  /**
   * Initialize the app: create the persistent header and content container,
   * check for a join URL parameter, show the appropriate initial screen,
   * and wire up all custom event listeners for navigation, game flow,
   * and network messages.
   */
  connectedCallback() {
    this.#header = document.createElement('header');
    this.#header.className = 'app-header';
    this.#header.innerHTML = '<svg class="app-logo" viewBox="0 0 100 25.038" aria-label="ZigNum"><path fill="currentColor" d="M23.019 2.223l-.613 4.012q-1.788 1.788-5.748 5.493-3.782 3.551-5.723 5.518 2.963-.076 8.967-.434 0 1.047-.536 4.93l-.307.282q-.97.051-6.49.383l-12.34.792-.23-.204.307-3.96L13.03 7.359 2.401 7.052q-.051-.409-.051-.92 0-.792.204-2.555.18-1.66.154-2.555.51-.434 1.38-.434.23 0 .715.051.485.026.715.026h1.253q1.149 0 2.145.076l13.797 1.201zm6.311-.383q-.383 2.938-.383 7.512l-.026 6.157q.026 1.175-.05 3.5l-.282.153-4.47.103q-.563-.358-.563-1.125 0-.332.102-1.021.102-.716.102-1.1 0-.255.103-1.839.46-7.92.46-9.249 0-1.61-.103-3.014.128-.205.946-.46.23.05.766.05.281 0 .869-.025.587-.025.894-.025 1.047 0 1.635.383zm14.154 5.442q0 .562-.05 1.175-1.023.307-5.162.46-.255-.23-.408-1.43-.154-1.023-.716-1.15h-.409q-1.967 0-2.58.383-.818.51-.818 2.81v.46q.026.281.026.435 0 .536-.102 1.584-.077 1.047-.077 1.584 0 2.606 1.559 3.347.613.28 1.584.28 1.277 0 1.865-.485.74-.613.715-1.303v-.076l-.255-.281h-2.173q-1.073 0-1.533-.46v-4.37l.255-.28q2.453.204 7.052.46l.256.28q.025.333.127 2.096.102 1.277.102 2.095 0 2.785-1.226 4.037-1.788 1.84-5.084 1.84-2.734 0-4.574-1.38-1.175-.87-1.584-2.504-.28-1.074-.28-3.015V12.085q0-5.212.306-6.872.204-1.201.945-2.223.818-1.15 1.712-1.354.307-.077 2.376-.384Q37.505.946 38.22.946q1.687 0 2.913.51.358.154.383.18.486.46.997.996.05.051.23.485.74 1.687.74 4.165zM59.989.946q0 .153-.127 1.047-.154 1.022-.307 4.012-.23 3.909-.23 8.737 0 .486.102 9.71l-.51.433-4.702-.153-.383-.383q-1.15-4.165-4.599-12.698v.639q0 1.941.256 4.624.204 1.737.485 5.136-.894.562-2.53.562-.46 0-1.405-.077-.92-.051-1.354-.051l-.357-.332q.434-6.618.434-13.746 0-3.091-.077-6.208.435-.46 1.354-.46.18 0 .486.025.332.026.51.026.384 0 1.15-.153.793-.18 1.176-.18.332 0 .613.103.562.843.97 2.35.64 2.3.69 2.453.46 1.329.946 2.683.562 1.533 1.124 2.606.128-1.43.128-3.22 0-1.302-.102-3.883-.103-2.606-.103-3.909 0-.28.41-.46.127-.025.408-.102L54.649 0h5.136q.204.358.204.946zm15.636 12.289q0 3.705-.332 6.694-.638 1.252-.996 1.533-.588.28-1.533.766-1.354.69-3.27.69-.792 0-2.3-.102-.23-.051-.664-.128-.434-.076-1.789-.332-2.248-.409-3.193-1.175-1.227-.997-1.227-3.117 0-.562.103-1.686.102-1.125.102-1.687v-.357q-.026-.23-.026-.358 0 .051.153-1.916l.282-4.037q.255-3.551 1.047-5.698.639-.536 1.712-.536.587 0 1.047.128.741.204.741.613 0 2.376-.153 6.26-.204 4.854-.23 6.233v.128q-.025.537.281 1.022.307.486.843.613.435.103 1.176.103 1.226 0 1.43-.741.077-.281.077-2.147 0-1.047-.102-3.142-.077-2.095-.077-3.143 0-3.014.537-5.263 1.354-.613 2.912-.613 1.66 0 2.887.69.205.562.205 1.482 0 .715.102 2.248.255 3.5.255 6.975zm24.374 11.267l-.153.23h-.74q-2.402.026-4.472-.306-.306-.486-.306-1.278 0-.715-.128-2.07-.128-2.018-.281-4.036-.154-2.402-.537-3.986-.664 1.66-1.15 3.96-.153.741-.715 4.063-.051.536-.23 1.354-.255.69-1.737.843l-2.12.102q-.818.102-.87.102-1.2 0-1.43-.92-.154-.715-.511-2.146-.869-3.168-2.606-7.128-.18 1.303-.18 2.862 0 1.252.154 3.755.154 2.504.154 3.756 0 1.124-.511 1.278-.46-.052-.971-.052-.562 0-1.687.077-1.098.077-1.66.077-.767 0-1.406-.102-.23-.741-.204-1.712v-.307q0-.536.051-1.533l.026-.383q-.026-.051 0-.128.025.026 0 .026-.026-.741-.026-1.584 0-2.887.307-9.428.28-6.08.23-9.402l.306-.307H81.4q.51.486.843 1.457.153.562.51 1.66.282.69.793 2.07.638 1.712 1.686 4.65 1.507 4.267 2.734 6.592.102-.18.638-1.482.256-.537.69-1.635.026-.103.358-1.227 1.66-5.672 2.76-11.267.357-.204.92-.204.561 0 1.123.153.562.128 1.457.204.996.077 1.328.588.639 11.344 2.76 22.764z"/></svg>';
    this.#header.addEventListener('click', () => this.#onTitleClicked());
    this.appendChild(this.#header);

    this.#content = document.createElement('main');
    this.appendChild(this.#content);

    this.#beforeUnloadHandler = (e) => {
      if (this.#isGameInProgress()) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', this.#beforeUnloadHandler);

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

    this.addEventListener('show-how-to-play', () => {
      this.#showHowToPlay();
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

  /**
   * Remove the beforeunload listener when the component is disconnected.
   */
  disconnectedCallback() {
    window.removeEventListener('beforeunload', this.#beforeUnloadHandler);
  }

  /**
   * Check whether a game is currently in progress (started and not over).
   * @returns {boolean} True if a game screen exists with an active (non-finished) game
   */
  #isGameInProgress() {
    if (!this.#gameScreen) return false;
    const state = this.#gameScreen.getState();
    return state && !state.gameOver;
  }

  /**
   * Handle a click on the header title. If a game is in progress, show a
   * confirmation dialog. For network games, notify the opponent before
   * leaving. If no game is in progress, navigate directly to the menu.
   */
  #onTitleClicked() {
    if (!this.#isGameInProgress()) {
      this.#cleanup();
      this.#showMenu();
      return;
    }

    const isNetwork = this.#mode === 'network' && this.#peerManager;
    const message = isNetwork
      ? 'Abort the current game? Your opponent will be notified.'
      : 'Abort the current game? Your progress will be lost.';

    if (!confirm(message)) return;

    if (isNetwork) {
      this.#peerManager.send({ type: 'game-abort' });
    }

    this.#cleanup();
    this.#showMenu();
  }

  /**
   * Clear the content area and show the main menu.
   */
  #showMenu() {
    this.#content.innerHTML = '';
    this.#gameScreen = null;
    const menu = document.createElement('main-menu');
    this.#content.appendChild(menu);
  }

  /**
   * Clear the content area and show the how-to-play rules screen.
   */
  #showHowToPlay() {
    this.#content.innerHTML = '';
    this.#gameScreen = null;
    const howTo = document.createElement('how-to-play');
    this.#content.appendChild(howTo);
  }

  /**
   * Clear the content area and show the player setup form.
   * @param {boolean} [isJoining=false] - Whether the player is joining an existing game
   * @param {string|null} [joinId=null] - The host's peer ID when joining
   */
  #showPlayerSetup(isJoining = false, joinId = null) {
    this.#content.innerHTML = '';
    this.#gameScreen = null;
    const setup = document.createElement('player-setup');
    this.#content.appendChild(setup);
    setup.mode = this.#mode;
    setup.joinId = joinId;
    setup.isJoining = isJoining;
  }

  /**
   * Clear the content area, create a game-screen element, and start a new game.
   * @param {string} player1Name
   * @param {string} player2Name
   * @param {string} mode - Game mode
   * @param {Object} [options={}] - Extra options (e.g. { localPlayer: 0|1 })
   */
  #showGame(player1Name, player2Name, mode, options = {}) {
    this.#currentP1 = player1Name;
    this.#currentP2 = player2Name;
    this.#content.innerHTML = '';
    const screen = document.createElement('game-screen');
    this.#gameScreen = screen;
    this.#content.appendChild(screen);
    screen.startGame(player1Name, player2Name, mode, options);
  }

  /**
   * Create a PeerManager as host, show the network lobby with the
   * shareable URL, and wire up connection/message/disconnect handlers.
   * @param {string} localName - The host player's display name
   */
  async #hostNetworkGame(localName) {
    this.#cleanup();
    this.#peerManager = new PeerManager();
    this.#localPlayerName = localName;

    this.#content.innerHTML = '';
    this.#gameScreen = null;
    const lobby = document.createElement('network-lobby');
    this.#content.appendChild(lobby);

    // Register status callback before createGame so early messages are captured
    this.#peerManager.onStatus((level, message) => {
      lobby.addLog(level, message);
    });

    try {
      const peerId = await this.#peerManager.createGame();
      lobby.showHost(peerId);

      // Re-register status callback — showHost replaces innerHTML
      this.#peerManager.onStatus((level, message) => {
        lobby.addLog(level, message);
      });

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

      // Re-register status callback — showError replaces innerHTML
      this.#peerManager.onStatus((level, message) => {
        lobby.addLog(level, message);
      });
    }
  }

  /**
   * Create a PeerManager as guest, connect to the host, show the lobby,
   * and wire up connection/message/disconnect handlers.
   * @param {string} localName - The guest player's display name
   * @param {string} peerId - The host's peer ID to connect to
   */
  async #joinNetworkGame(localName, peerId) {
    this.#cleanup();
    this.#peerManager = new PeerManager();
    this.#localPlayerName = localName;

    this.#content.innerHTML = '';
    this.#gameScreen = null;
    const lobby = document.createElement('network-lobby');
    this.#content.appendChild(lobby);
    lobby.showJoining();

    // Register status callback before joinGame so early messages are captured
    this.#peerManager.onStatus((level, message) => {
      lobby.addLog(level, message);
    });

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

      // Re-register status callback — showError replaces innerHTML
      this.#peerManager.onStatus((level, message) => {
        lobby.addLog(level, message);
      });
    }
  }

  /**
   * Route an incoming network message to the appropriate handler based
   * on its type (player-info, game-start, move, rematch-request, rematch-accept).
   * @param {Object} msg - The received message object with a `type` property
   */
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

      case 'game-abort':
        this.#cleanup();
        this.#showMenu();
        alert('Your opponent has left the game.');
        break;
    }
  }

  /**
   * Generate a new game state on the host side, send it to the guest,
   * and show the game screen locally. Randomly assigns player indices.
   */
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

  /**
   * Display a full-screen overlay indicating the opponent has disconnected.
   * Includes a "Back to Menu" button so the user is not stranded.
   */
  #showDisconnectOverlay() {
    // Remove existing overlay
    this.#hideDisconnectOverlay();
    const dialog = document.createElement('dialog');
    dialog.className = 'disconnect-dialog';
    dialog.id = 'disconnect-overlay';
    dialog.innerHTML = `
      <p>Opponent disconnected.</p>
      <p>Waiting for reconnection...</p>
      <button id="disconnect-back-btn">Back to Menu</button>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#disconnect-back-btn').addEventListener('click', () => {
      this.#cleanup();
      this.#showMenu();
    });

    dialog.showModal();
  }

  /**
   * Remove the disconnect overlay if it exists.
   */
  #hideDisconnectOverlay() {
    const existing = document.getElementById('disconnect-overlay');
    if (existing) {
      if (existing.open) existing.close();
      existing.remove();
    }
  }

  /**
   * Tear down the current network session: remove overlays, destroy the
   * PeerManager, clear screen references, and clean the URL query string.
   */
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

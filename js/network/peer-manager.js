/**
 * ICE server configuration for WebRTC connections.
 * Includes STUN for NAT discovery and TURN relays as fallback
 * when direct peer-to-peer connections cannot be established
 * (e.g. symmetric NATs, restrictive firewalls).
 * @type {RTCIceServer[]}
 */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

/**
 * PeerJS wrapper for network play.
 * Handles peer creation, connection, messaging, and reconnection.
 * @class
 */
export class PeerManager {
  /** @type {Peer|null} PeerJS Peer instance */
  #peer = null;
  /** @type {DataConnection|null} Active data connection to the remote peer */
  #conn = null;
  /** @type {boolean} Whether this instance is the game host */
  #isHost = false;
  /** @type {Function|null} Callback invoked when a message is received */
  #onMessageCallback = null;
  /** @type {Function|null} Callback invoked when the connection opens */
  #onConnectedCallback = null;
  /** @type {Function|null} Callback invoked when the connection closes */
  #onDisconnectedCallback = null;
  /** @type {boolean} Whether this manager has been destroyed */
  #destroyed = false;

  /**
   * Create a new game as host. Opens a PeerJS peer and waits for
   * incoming connections.
   * @returns {Promise<string>} The peer ID to share with the guest
   */
  createGame() {
    return new Promise((resolve, reject) => {
      this.#isHost = true;
      this.#peer = new Peer({ config: { iceServers: ICE_SERVERS } });

      this.#peer.on('open', (id) => {
        resolve(id);
      });

      this.#peer.on('connection', (conn) => {
        this.#setupConnection(conn);
      });

      this.#peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id' || err.type === 'browser-incompatible') {
          reject(err);
        }
      });

      this.#peer.on('disconnected', () => {
        // Try to reconnect to signaling server
        if (!this.#destroyed) {
          this.#peer.reconnect();
        }
      });
    });
  }

  /**
   * Join an existing game as guest by connecting to the host's peer ID.
   * @param {string} peerId - The host's peer ID
   * @returns {Promise<void>} Resolves when the peer is open and connection is initiated
   */
  joinGame(peerId) {
    return new Promise((resolve, reject) => {
      this.#isHost = false;
      this.#peer = new Peer({ config: { iceServers: ICE_SERVERS } });

      this.#peer.on('open', () => {
        const conn = this.#peer.connect(peerId, { reliable: true });
        this.#setupConnection(conn);
        resolve();
      });

      this.#peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
          reject(new Error('Game not found. The host may have left.'));
        }
      });

      this.#peer.on('disconnected', () => {
        if (!this.#destroyed) {
          this.#peer.reconnect();
        }
      });
    });
  }

  /**
   * Wire up open/data/close/error handlers on a data connection.
   * @param {DataConnection} conn - The PeerJS data connection to configure
   */
  #setupConnection(conn) {
    this.#conn = conn;

    conn.on('open', () => {
      if (this.#onConnectedCallback) this.#onConnectedCallback();
    });

    conn.on('data', (data) => {
      if (this.#onMessageCallback) this.#onMessageCallback(data);
    });

    conn.on('close', () => {
      if (this.#onDisconnectedCallback) this.#onDisconnectedCallback();
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  /**
   * Whether this peer is the game host.
   * @returns {boolean}
   */
  get isHost() {
    return this.#isHost;
  }

  /**
   * Whether the data connection is currently open.
   * @returns {boolean}
   */
  get isConnected() {
    return this.#conn && this.#conn.open;
  }

  /**
   * Send a JSON message to the remote peer.
   * @param {Object} message - The message object to send
   */
  send(message) {
    if (this.#conn && this.#conn.open) {
      this.#conn.send(message);
    }
  }

  /**
   * Register a callback for incoming messages.
   * @param {Function} callback - Invoked with the received message object
   */
  onMessage(callback) {
    this.#onMessageCallback = callback;
  }

  /**
   * Register a callback for when the connection opens.
   * @param {Function} callback - Invoked when the data channel opens
   */
  onConnected(callback) {
    this.#onConnectedCallback = callback;
  }

  /**
   * Register a callback for when the connection closes.
   * @param {Function} callback - Invoked when the data channel closes
   */
  onDisconnected(callback) {
    this.#onDisconnectedCallback = callback;
  }

  /**
   * Tear down the connection and peer. Marks this manager as destroyed
   * so reconnection attempts are suppressed.
   */
  destroy() {
    this.#destroyed = true;
    if (this.#conn) {
      this.#conn.close();
    }
    if (this.#peer) {
      this.#peer.destroy();
    }
  }
}

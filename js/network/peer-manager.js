/**
 * PeerJS wrapper for network play.
 * Handles peer creation, connection, messaging, and reconnection.
 */
export class PeerManager {
  #peer = null;
  #conn = null;
  #isHost = false;
  #onMessageCallback = null;
  #onConnectedCallback = null;
  #onDisconnectedCallback = null;
  #destroyed = false;

  /**
   * Create a new game as host. Returns the peer ID.
   */
  createGame() {
    return new Promise((resolve, reject) => {
      this.#isHost = true;
      this.#peer = new Peer();

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
   * Join an existing game as guest.
   */
  joinGame(peerId) {
    return new Promise((resolve, reject) => {
      this.#isHost = false;
      this.#peer = new Peer();

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

  get isHost() {
    return this.#isHost;
  }

  get isConnected() {
    return this.#conn && this.#conn.open;
  }

  send(message) {
    if (this.#conn && this.#conn.open) {
      this.#conn.send(message);
    }
  }

  onMessage(callback) {
    this.#onMessageCallback = callback;
  }

  onConnected(callback) {
    this.#onConnectedCallback = callback;
  }

  onDisconnected(callback) {
    this.#onDisconnectedCallback = callback;
  }

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

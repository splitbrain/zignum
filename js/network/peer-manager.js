/**
 * PeerJS wrapper for network play.
 * Handles peer creation, connection, messaging, and reconnection.
 */
export class PeerManager {
  constructor() {
    this._peer = null;
    this._conn = null;
    this._isHost = false;
    this._onMessageCallback = null;
    this._onConnectedCallback = null;
    this._onDisconnectedCallback = null;
    this._onReconnectedCallback = null;
    this._onErrorCallback = null;
    this._destroyed = false;
  }

  /**
   * Create a new game as host. Returns the peer ID.
   */
  createGame() {
    return new Promise((resolve, reject) => {
      this._isHost = true;
      this._peer = new Peer();

      this._peer.on('open', (id) => {
        resolve(id);
      });

      this._peer.on('connection', (conn) => {
        this._setupConnection(conn);
      });

      this._peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (this._onErrorCallback) this._onErrorCallback(err);
        if (err.type === 'unavailable-id' || err.type === 'browser-incompatible') {
          reject(err);
        }
      });

      this._peer.on('disconnected', () => {
        // Try to reconnect to signaling server
        if (!this._destroyed) {
          this._peer.reconnect();
        }
      });
    });
  }

  /**
   * Join an existing game as guest.
   */
  joinGame(peerId) {
    return new Promise((resolve, reject) => {
      this._isHost = false;
      this._peer = new Peer();

      this._peer.on('open', () => {
        const conn = this._peer.connect(peerId, { reliable: true });
        this._setupConnection(conn);
        resolve();
      });

      this._peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (this._onErrorCallback) this._onErrorCallback(err);
        if (err.type === 'peer-unavailable') {
          reject(new Error('Game not found. The host may have left.'));
        }
      });

      this._peer.on('disconnected', () => {
        if (!this._destroyed) {
          this._peer.reconnect();
        }
      });
    });
  }

  _setupConnection(conn) {
    this._conn = conn;

    conn.on('open', () => {
      if (this._onConnectedCallback) this._onConnectedCallback();
    });

    conn.on('data', (data) => {
      if (this._onMessageCallback) this._onMessageCallback(data);
    });

    conn.on('close', () => {
      if (this._onDisconnectedCallback) this._onDisconnectedCallback();
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  get isHost() {
    return this._isHost;
  }

  get isConnected() {
    return this._conn && this._conn.open;
  }

  send(message) {
    if (this._conn && this._conn.open) {
      this._conn.send(message);
    }
  }

  onMessage(callback) {
    this._onMessageCallback = callback;
  }

  onConnected(callback) {
    this._onConnectedCallback = callback;
  }

  onDisconnected(callback) {
    this._onDisconnectedCallback = callback;
  }

  onReconnected(callback) {
    this._onReconnectedCallback = callback;
  }

  onError(callback) {
    this._onErrorCallback = callback;
  }

  destroy() {
    this._destroyed = true;
    if (this._conn) {
      this._conn.close();
    }
    if (this._peer) {
      this._peer.destroy();
    }
  }
}

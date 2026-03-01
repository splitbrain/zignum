/**
 * ICE server configuration for WebRTC connections.
 * Includes STUN for NAT discovery and TURN relays as fallback
 * when direct peer-to-peer connections cannot be established
 * (e.g. symmetric NATs, restrictive firewalls).
 * @type {RTCIceServer[]}
 */
const ICE_SERVERS = [
    {
        urls: "stun:stun.relay.metered.ca:80",
    },
    {
        urls: "turn:global.relay.metered.ca:80",
        username: "3cdad4ba7198ed3fac9dfcea",
        credential: "agGs9DagEXXDGmOk",
    },
    {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "3cdad4ba7198ed3fac9dfcea",
        credential: "agGs9DagEXXDGmOk",
    },
    {
        urls: "turn:global.relay.metered.ca:443",
        username: "3cdad4ba7198ed3fac9dfcea",
        credential: "agGs9DagEXXDGmOk",
    },
    {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "3cdad4ba7198ed3fac9dfcea",
        credential: "agGs9DagEXXDGmOk",
    },
];

/**
 * Human-readable descriptions for ICE connection states.
 * @type {Object<string, string>}
 */
const ICE_STATE_LABELS = {
  new: 'Initializing ICE agent...',
  checking: 'Testing connection paths...',
  connected: 'Peer-to-peer link established',
  completed: 'Connection route locked in',
  failed: 'All connection attempts failed — no route to peer',
  disconnected: 'Peer-to-peer link lost, attempting recovery...',
  closed: 'ICE agent shut down'
};

/**
 * Human-readable descriptions for ICE gathering states.
 * @type {Object<string, string>}
 */
const ICE_GATHER_LABELS = {
  new: 'Preparing to discover network candidates...',
  gathering: 'Discovering STUN/TURN network candidates...',
  complete: 'All network candidates discovered'
};

/**
 * PeerJS wrapper for network play.
 * Handles peer creation, connection, messaging, and reconnection.
 * Emits status updates via an optional callback so the UI can
 * display connection progress and diagnostics.
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
  /** @type {Function|null} Callback invoked with status log entries */
  #onStatusCallback = null;
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
      this.#emitStatus('info', 'Connecting to signaling server...');
      this.#peer = new Peer({ config: { iceServers: ICE_SERVERS } });

      this.#peer.on('open', (id) => {
        this.#emitStatus('success', 'Registered with signaling server');
        this.#emitStatus('info', `Peer ID: ${id}`);
        this.#emitStatus('info', 'Waiting for opponent to connect...');
        resolve(id);
      });

      this.#peer.on('connection', (conn) => {
        this.#emitStatus('success', 'Opponent found — opening data channel...');
        this.#setupConnection(conn);
      });

      this.#peer.on('error', (err) => {
        console.error('Peer error:', err);
        this.#emitStatus('error', `Peer error: ${err.type} — ${err.message}`);
        if (err.type === 'unavailable-id' || err.type === 'browser-incompatible') {
          reject(err);
        }
      });

      this.#peer.on('disconnected', () => {
        this.#emitStatus('warn', 'Lost signaling server connection, reconnecting...');
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
      this.#emitStatus('info', 'Connecting to signaling server...');
      this.#peer = new Peer({ config: { iceServers: ICE_SERVERS } });

      this.#peer.on('open', () => {
        this.#emitStatus('success', 'Registered with signaling server');
        this.#emitStatus('info', `Connecting to host ${peerId.slice(0, 8)}...`);
        const conn = this.#peer.connect(peerId, { reliable: true });
        this.#setupConnection(conn);
        resolve();
      });

      this.#peer.on('error', (err) => {
        console.error('Peer error:', err);
        this.#emitStatus('error', `Peer error: ${err.type} — ${err.message}`);
        if (err.type === 'peer-unavailable') {
          reject(new Error('Game not found. The host may have left.'));
        }
      });

      this.#peer.on('disconnected', () => {
        this.#emitStatus('warn', 'Lost signaling server connection, reconnecting...');
        if (!this.#destroyed) {
          this.#peer.reconnect();
        }
      });
    });
  }

  /**
   * Wire up open/data/close/error handlers on a data connection.
   * Also monitors the underlying ICE connection and gathering states
   * so the UI can show detailed connection progress.
   * @param {DataConnection} conn - The PeerJS data connection to configure
   */
  #setupConnection(conn) {
    this.#conn = conn;

    conn.on('open', () => {
      this.#emitStatus('success', 'Data channel open — connected!');
      if (this.#onConnectedCallback) this.#onConnectedCallback();
    });

    conn.on('data', (data) => {
      if (this.#onMessageCallback) this.#onMessageCallback(data);
    });

    conn.on('close', () => {
      this.#emitStatus('warn', 'Data channel closed');
      if (this.#onDisconnectedCallback) this.#onDisconnectedCallback();
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.#emitStatus('error', `Connection error: ${err.message || err}`);
    });

    // Monitor the underlying RTCPeerConnection for ICE diagnostics
    conn.on('iceStateChanged', (state) => {
      const label = ICE_STATE_LABELS[state] || state;
      const level = state === 'failed' ? 'error'
        : state === 'disconnected' ? 'warn'
        : state === 'connected' || state === 'completed' ? 'success'
        : 'info';
      this.#emitStatus(level, `ICE: ${label}`);
    });

    // PeerJS may not expose iceStateChanged on all versions, so also
    // try to attach directly to the underlying RTCPeerConnection.
    this.#monitorRTCPeerConnection(conn);
  }

  /**
   * Attach iceconnectionstatechange and icegatheringstatechange listeners
   * directly to the RTCPeerConnection underlying a PeerJS DataConnection.
   * PeerJS stores it as `conn.peerConnection` (or `conn._peerConnection`
   * in some builds). If neither is available, this is a no-op.
   * @param {DataConnection} conn - The PeerJS data connection
   */
  #monitorRTCPeerConnection(conn) {
    /** @type {RTCPeerConnection|null} */
    const pc = conn.peerConnection || conn._peerConnection || null;
    if (!pc) {
      this.#emitStatus('info', 'Waiting for WebRTC peer connection...');
      // PeerJS creates the RTCPeerConnection lazily; poll briefly.
      let attempts = 0;
      const interval = setInterval(() => {
        const rtc = conn.peerConnection || conn._peerConnection || null;
        attempts++;
        if (rtc) {
          clearInterval(interval);
          this.#attachRTCListeners(rtc);
        } else if (attempts > 20) {
          clearInterval(interval);
          this.#emitStatus('warn', 'Could not access RTCPeerConnection for diagnostics');
        }
      }, 250);
      return;
    }
    this.#attachRTCListeners(pc);
  }

  /**
   * Attach ICE state and gathering state listeners to an RTCPeerConnection.
   * @param {RTCPeerConnection} pc - The WebRTC peer connection to monitor
   */
  #attachRTCListeners(pc) {
    this.#emitStatus('info', `ICE: ${ICE_STATE_LABELS[pc.iceConnectionState] || pc.iceConnectionState}`);

    pc.addEventListener('iceconnectionstatechange', () => {
      const state = pc.iceConnectionState;
      const label = ICE_STATE_LABELS[state] || state;
      const level = state === 'failed' ? 'error'
        : state === 'disconnected' ? 'warn'
        : state === 'connected' || state === 'completed' ? 'success'
        : 'info';
      this.#emitStatus(level, `ICE: ${label}`);
    });

    pc.addEventListener('icegatheringstatechange', () => {
      const state = pc.iceGatheringState;
      const label = ICE_GATHER_LABELS[state] || state;
      this.#emitStatus('info', `ICE gathering: ${label}`);
    });

    pc.addEventListener('icecandidateerror', (/** @type {RTCPeerConnectionIceErrorEvent} */ event) => {
      this.#emitStatus('warn',
        `ICE candidate error: ${event.errorText || 'unknown'} (code ${event.errorCode}, ${event.url || 'no url'})`);
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
   * Register a callback for connection status updates.
   * Each call receives a level string ('info', 'success', 'warn', 'error')
   * and a human-readable message.
   * @param {function(string, string): void} callback - Invoked with (level, message)
   */
  onStatus(callback) {
    this.#onStatusCallback = callback;
  }

  /**
   * Emit a status update to the registered callback (if any) and also
   * log it to the console.
   * @param {'info'|'success'|'warn'|'error'} level - Severity level
   * @param {string} message - Human-readable status message
   */
  #emitStatus(level, message) {
    if (level === 'error') {
      console.error(`[PeerManager] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[PeerManager] ${message}`);
    } else {
      console.log(`[PeerManager] ${message}`);
    }
    if (this.#onStatusCallback) this.#onStatusCallback(level, message);
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

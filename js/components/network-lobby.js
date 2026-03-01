/**
 * Network lobby screen. Displays either a shareable URL for the host,
 * a "Connecting..." message for the guest, or an error message.
 * Includes a live connection log that shows diagnostic messages
 * from PeerManager so users can see what is happening with the connection.
 * @class
 * @extends HTMLElement
 */
export class NetworkLobby extends HTMLElement {
  /** @type {HTMLElement|null} The connection log container */
  #logContainer = null;

  /**
   * Show the host lobby with a shareable game URL and a "Copy URL" button.
   * @param {string} peerId - The host's peer ID to embed in the URL
   */
  showHost(peerId) {
    this.classList.add('network-lobby');
    const url = `${window.location.origin}${window.location.pathname}?join=${peerId}`;
    this.innerHTML = `
      <h2>Waiting for Opponent</h2>
      <p>Share this URL with your opponent:</p>
      <div class="share-url">
        <input type="text" value="${url}" readonly id="share-url-input">
      </div>
      <button id="copy-btn">Copy URL</button>
      <button id="back-btn" class="secondary-btn">Back to Menu</button>
    `;
    this.#appendLog();

    this.querySelector('#copy-btn').addEventListener('click', () => {
      const input = this.querySelector('#share-url-input');
      input.select();
      navigator.clipboard.writeText(input.value).catch(() => {
        // Fallback: the text is already selected
      });
      this.querySelector('#copy-btn').textContent = 'Copied!';
    });

    this.querySelector('#back-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });
  }

  /**
   * Show a "Connecting..." message while the guest waits to join.
   */
  showJoining() {
    this.classList.add('network-lobby');
    this.innerHTML = `
      <h2>Connecting...</h2>
      <p>Connecting to game host...</p>
      <button id="back-btn" class="secondary-btn">Back to Menu</button>
    `;
    this.#appendLog();

    this.querySelector('#back-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });
  }

  /**
   * Show a connection error message with a "Back to Menu" button.
   * @param {string} message - The error message to display
   */
  showError(message) {
    this.classList.add('network-lobby');
    this.innerHTML = `
      <h2>Connection Error</h2>
      <p>${message}</p>
      <button id="back-btn">Back to Menu</button>
    `;
    this.#appendLog();

    this.querySelector('#back-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });
  }

  /**
   * Append a status entry to the connection log.
   * @param {'info'|'success'|'warn'|'error'} level - Severity level
   * @param {string} message - Human-readable status message
   */
  addLog(level, message) {
    if (!this.#logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    entry.textContent = `${time}  ${message}`;
    this.#logContainer.appendChild(entry);
    this.#logContainer.scrollTop = this.#logContainer.scrollHeight;
  }

  /**
   * Create and append the connection log container to the lobby.
   */
  #appendLog() {
    const wrapper = document.createElement('details');
    wrapper.className = 'connection-log-details';
    wrapper.open = true;

    const summary = document.createElement('summary');
    summary.textContent = 'Connection log';
    wrapper.appendChild(summary);

    this.#logContainer = document.createElement('div');
    this.#logContainer.className = 'connection-log';
    wrapper.appendChild(this.#logContainer);

    this.appendChild(wrapper);
  }
}

customElements.define('network-lobby', NetworkLobby);

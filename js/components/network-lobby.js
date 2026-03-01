/**
 * Network lobby screen. Displays either a shareable URL for the host,
 * a "Connecting..." message for the guest, or an error message.
 * @class
 * @extends HTMLElement
 */
export class NetworkLobby extends HTMLElement {
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
      <p>Waiting for opponent to connect...</p>
    `;

    this.querySelector('#copy-btn').addEventListener('click', () => {
      const input = this.querySelector('#share-url-input');
      input.select();
      navigator.clipboard.writeText(input.value).catch(() => {
        // Fallback: the text is already selected
      });
      this.querySelector('#copy-btn').textContent = 'Copied!';
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
    `;
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

    this.querySelector('#back-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });
  }
}

customElements.define('network-lobby', NetworkLobby);

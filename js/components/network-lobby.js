export class NetworkLobby extends HTMLElement {
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

  showJoining() {
    this.classList.add('network-lobby');
    this.innerHTML = `
      <h2>Connecting...</h2>
      <p>Connecting to game host...</p>
    `;
  }

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

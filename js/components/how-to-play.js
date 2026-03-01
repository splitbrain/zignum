/**
 * How to Play screen. Displays the game rules, mechanics, and special stone
 * descriptions. Includes a "Back to Menu" button that dispatches a
 * 'back-to-menu' event.
 * @class
 * @extends HTMLElement
 */
export class HowToPlay extends HTMLElement {
  /**
   * Render the rules content and attach the back button handler.
   */
  connectedCallback() {
    this.classList.add('how-to-play');
    this.innerHTML = `
      <h2>How to Play</h2>

      <section>
        <h3>Goal</h3>
        <p>Score more points than your opponent by picking stones from a 7&times;7 grid.</p>
      </section>

      <section>
        <h3>Taking Turns</h3>
        <p>Each turn, the <strong>active line</strong> (a row or column) is highlighted.
        Pick any unpicked stone from that line to add its value to your score.</p>
        <p>After you pick, the active line switches orientation: if it was a
        <strong>row</strong>, it becomes the <strong>column</strong> at the
        position you picked, and vice versa.</p>
      </section>

      <section>
        <h3>Stones</h3>
        <p>Normal stones show a signed value like <strong>+5</strong> or
        <strong>-3</strong>. Picking one adds that value to your score.</p>
      </section>

      <section>
        <h3>Special Stones</h3>
        <dl>
          <dt>INV &mdash; Invert</dt>
          <dd>Flips the sign of every normal stone on the board. Positives become
          negatives and vice versa.</dd>
          <dt>RND &mdash; Random</dt>
          <dd>Adds a random value (between &minus;9 and +9) to your score.</dd>
          <dt>SKP &mdash; Skip</dt>
          <dd>The active line still switches, but your opponent's turn is
          skipped &mdash; you get to go again.</dd>
        </dl>
      </section>

      <section>
        <h3>Game Over</h3>
        <p>The game ends when the newly activated line has no remaining stones.
        The player with the higher score wins.</p>
      </section>

      <section>
        <h3>Game Modes</h3>
        <dl>
          <dt>Solo Play</dt>
          <dd>Play against the computer.</dd>
          <dt>Hot Seat</dt>
          <dd>Two players take turns on the same device.</dd>
          <dt>Network Play</dt>
          <dd>Play against a friend online via a shared link.</dd>
        </dl>
      </section>

      <h2>About</h2>
      
      <section>
        <p>This game is inspired by a game written for the Sharp Zaurus PDA for a University project
        by Frank Schubert and <a href="https://www.splitbrain.org">Andreas Gohr</a> back in 2003.
        That game was in turn inspired a similar game that was available for Palm OS PDAs around the early 2000s.</p>
        
        <p>The version available here was mostly written by Claude, prompted based on the original C++ code.</p>
      </section>

      <button id="back-btn">Back to Menu</button>
    `;

    this.querySelector('#back-btn').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-menu', { bubbles: true }));
    });
  }
}

customElements.define('how-to-play', HowToPlay);

# AGENTS.md

## Project Overview

ZNum is a turn-based number puzzle game on a 7x7 grid, implemented as a browser-only web application. Players pick stones from an active row or column, collecting points. The active line switches orientation after each pick. The game ends when the newly activated line has no remaining stones.

Three game modes: **Solo** (vs AI), **Hot Seat** (two humans, same device), **Network** (peer-to-peer via PeerJS/WebRTC).

## Tech Stack

- **Vanilla JavaScript** with ES6 modules loaded natively by the browser (`<script type="module">`)
- **Web Components** (`HTMLElement` subclasses, `customElements.define()`) without Shadow DOM
- **Modern CSS** with nesting (`&`), custom properties, CSS Grid
- **PeerJS 1.5.4** via CDN (the only external dependency)
- **No build pipeline**, no package.json, no npm, no bundler, no transpiler

## Architecture

### Directory Structure

```
znum/
├── index.html              — Entry point, loads PeerJS CDN + app module
├── css/
│   └── styles.css          — All styles (one file, uses CSS nesting + custom properties)
└── js/
    ├── app.js              — Module entry point (imports znum-app.js)
    ├── model/              — Pure data models (no DOM)
    │   ├── constants.js    — GRID_SIZE, special stone types, AI_DEPTH, line types
    │   ├── stone.js        — Stone object: { value, sign, type, picked }
    │   ├── board.js        — Flat Array(49), indexed as row * 7 + col
    │   └── player.js       — Player object: { name, score, isAI }
    ├── game/               — Game logic (pure functions, no DOM)
    │   ├── game-state.js   — State factory: { board, players, currentPlayer, activeLineType, ... }
    │   ├── game-logic.js   — pickStone(), getAvailableMoves(), isValidMove(), game over check
    │   └── ai.js           — Minimax look-ahead AI with depth discounting
    ├── network/
    │   └── peer-manager.js — PeerJS wrapper: create/join game, send/receive, reconnection
    ├── components/         — Web Components (UI layer)
    │   ├── znum-app.js     — Top-level router + network orchestrator
    │   ├── main-menu.js    — Mode selection screen
    │   ├── player-setup.js — Name input with localStorage
    │   ├── game-board.js   — 7x7 CSS Grid of <game-stone> elements
    │   ├── game-stone.js   — Single stone: display value, click handling
    │   ├── score-bar.js    — Player names, scores, turn indicator
    │   ├── game-screen.js  — Game controller (wires board + logic + AI + network)
    │   ├── game-over-dialog.js — Win/tie overlay with rematch support
    │   └── network-lobby.js    — URL sharing / waiting screen
    └── utils/
        └── storage.js      — localStorage helpers for player names
```

### Key Design Patterns

1. **Model/View separation** — `model/` and `game/` are pure JS with zero DOM dependency. Components in `components/` render state and dispatch events.
2. **Event-driven communication** — Child components dispatch custom DOM events (bubbling). Parent components listen and call methods downward.
3. **Immutable state updates** — `pickStone()` clones the board and players before mutating, returning a new state object.
4. **Dynamic import** — `ai.js` is loaded via `await import(...)` in `game-screen.js` only when needed.

### Data Flow

```
User click → <game-stone> dispatches 'stone-clicked'
           → <game-screen> calls pickStone() → re-renders
             (solo) → schedules AI via findBestMove()
             (network) → dispatches 'local-move'
           → <znum-app> sends move via PeerManager
           → Remote peer receives → znum-app calls gameScreen.applyRemoteMove()
```

### Network Protocol

Messages are JSON over WebRTC data channels (ordered, reliable):

| Type | Payload | Purpose |
|---|---|---|
| `player-info` | `{ name }` | Guest sends name to host |
| `game-start` | `{ board, activeLineType, activeLineIndex, startingPlayer, hostName, guestPlayer, players }` | Host sends authoritative initial state |
| `move` | `{ col, row, randomValue? }` | Stone picked. `randomValue` only present for Random stones |
| `rematch-request` | `{}` | Either player requests rematch |
| `rematch-accept` | `{}` | Other player accepts |

## Coding Standards

These rules apply to all new and modified code. They exist to prevent regressions on issues that were already fixed.

### JavaScript

1. **JSDoc on every function, method, and class.** Every function (exported or internal), every class, and every method (public, private, getters, setters, lifecycle callbacks like `connectedCallback`) must have a `/** */` block with `@param` and `@returns` annotations where applicable. Classes should include `@class` and `@extends` tags. Use `@typedef` for plain-object shapes (`Stone`, `Player`, `GameState`, etc.) and reference them in parameter types.

2. **`#` private fields, never `_` prefix.** All private properties and methods in classes (Web Components, PeerManager, etc.) must use ES2022 `#` private syntax. Never use underscore-prefix convention. If another component needs access to a value, add an explicit public method or setter — do not reach into private state.

3. **No logic duplication between AI and game logic.** Move mechanics (stone type effects, board inversion, active line switching, skip handling) live in `game-logic.js` as composable pure functions. The AI in `ai.js` must call these shared functions, not reimplement them. If a game rule changes, it should only need to change in one place.

4. **No dead code.** Do not commit exported functions that are never imported, unused imports, or callback registrations that are never invoked. Remove dead code rather than commenting it out.

5. **Relative paths only.** All asset references — in HTML (`src`, `href`), JS (`import`, `fetch`, service worker registration), `manifest.webmanifest`, and the service worker's precache list — must use relative paths (`./sw.js`, `./css/styles.css`) instead of root-absolute paths (`/sw.js`, `/css/styles.css`). The app is deployed to a GitHub Pages project sub-path (`/zignum/`), so root-absolute paths resolve against the wrong base URL and break.

### CSS

5. **No hardcoded colors.** Every color must be a CSS custom property defined in the `:root` block of `styles.css`. Use `color-mix()` to derive variants (e.g., lighter/darker shades) from base color variables instead of hardcoding hex values.

6. **No hardcoded sizes or spacing.** Use the spacing tokens (`--space-sm`, `--space-lg`) and the border-radius token (`--radius`) defined in `:root`. Do not introduce raw `px` values for padding, margin, gap, or border-radius without first checking whether an existing token fits. For font sizes, only add a `font-size` declaration when the element genuinely needs to differ from the inherited size (e.g., a large title or a prominent score). Do not declare `font-size: 1em` — it's the default. Prefer relative units (`em`, `rem`) for the few sizes that do need to differ.

## Testing with Playwright MCP

There are no automated tests. Verification is done manually via the Playwright MCP browser tools. Below is how to set up and run manual verification.

### Setup

1. Start the local server:
   ```sh
   python3 -m http.server 8000 --directory /home/andi/projects/znum
   ```
2. Navigate Playwright to the app:
   ```
   playwright_browser_navigate → http://localhost:8000
   ```

### General Workflow

1. **Navigate** to `http://localhost:8000`
2. **Take a snapshot** (`playwright_browser_snapshot`) to see the current DOM structure with element refs
3. **Click elements** using refs from the snapshot (`playwright_browser_click`)
4. **Check for errors** after interactions (`playwright_browser_console_messages` with level `error`)
5. **Take screenshots** (`playwright_browser_take_screenshot`) for visual verification
6. **Evaluate JS** in the page context (`playwright_browser_evaluate`) for programmatic checks

### Verifying Each Game Mode

#### Main Menu
```
Navigate to http://localhost:8000
Snapshot — confirm three buttons: "Solo Play", "Hot Seat", "Network Play"
```

#### Hot Seat Mode
```
Click "Hot Seat" → Player Setup screen appears
Fill player names → Click "Start Game"
Snapshot — confirm 7x7 grid, score bar, turn indicator, active line highlighted
Click an active stone → confirm:
  - Score updates for current player
  - Turn switches to other player
  - Active line switches orientation (row ↔ col)
  - Picked stone becomes dimmed/empty
Play until game over → confirm dialog shows winner and scores
Click "New Game" → fresh board, scores reset
Click "Back to Menu" → returns to main menu
```

#### Solo Mode (vs AI)
```
Click "Solo Play" → enter name → Start Game
If AI goes first, wait ~400ms for its move
Click a stone on your turn → AI responds after brief delay
Verify AI does not pick invalid stones (must be in active line, not picked)
Play to completion → game over dialog appears
```

#### Network Mode
```
Tab 1 (Host):
  Click "Network Play" → enter name → Start Game
  Lobby shows shareable URL with ?join=<peerId>
  Copy the URL

Tab 2 (Guest):
  Navigate to the copied URL
  Enter name → Start Game
  Both tabs should show the same board

Make moves on each tab in turn:
  - Verify moves sync instantly to the other tab
  - Verify scores match on both sides
  - Verify input is gated (can only click on your turn)

Test reconnection:
  - Close guest tab → host should show disconnect overlay
  - Reopen and rejoin → game should resume

Test rematch:
  - Play to game over → click "Rematch" on one side
  - Other side sees rematch offer → click "Accept"
  - New game starts with fresh board
```

#### Special Stones
```
INV (Invert): All stone values flip sign. Status message shows "All values inverted!"
RND (Random): Random value added to score. Status shows "Random: +N!" or "Random: -N!"
SKP (Skip): Current player gets another turn. Status shows "Turn skipped!"
  - Active line still switches after picking a Skip stone
  - Only the turn stays with the same player
```

### Automated Playthrough via Evaluate

To quickly play a full game programmatically:

```js
// Use playwright_browser_evaluate with this function:
async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let moves = 0;
  while (moves < 100) {
    await sleep(600);
    const overlay = document.querySelector('.game-over-overlay');
    if (overlay) return { moves, gameOver: true, text: overlay.textContent.trim() };
    const active = document.querySelectorAll('game-stone.active');
    if (active.length === 0) continue;
    active[Math.floor(Math.random() * active.length)].click();
    moves++;
  }
  return { moves, gameOver: false };
}
```

This clicks random active stones until the game ends. Works for both Hot Seat and Solo mode (the AI moves happen automatically between human clicks).

### What to Check After Any Code Change

1. Page loads without console errors
2. All three game modes reach the game screen
3. Stones can be clicked, scores update, turns alternate
4. Active line switches correctly (row ↔ col)
5. Game over triggers when active line is empty
6. Special stones produce correct effects
7. AI responds in Solo mode without errors
8. Network mode syncs moves between two tabs

# ZNum Implementation Plan

## Analysis of the Old Implementation

The original is a Qt/C++ desktop application with these key classes:

| Old Class | Responsibility |
|---|---|
| `Field` | Single stone on the grid (QToolButton). Holds value, row/col position. Handles select (disable + return value), activate (enable/disable + color). Special stones encoded as values 10 (Invert), 11 (Random), 12 (Skip). |
| `PlayGround` | The 7x7 grid (QGrid). Owns `Field[7][7]` and `Player[2]`. Manages active line (type=ROW/COL, index). Handles click → select stone → update score → switch active line → check game over → switch player. Triggers AI. |
| `SimplePlayGround` | Lightweight int[49] copy of the board for AI simulation. Supports `copyFrom`, `getValueAt`, `setValueAt`, `invert`. |
| `ArtificialIntelligence` | `bestField()` iterates all stones in active line, simulates picking each, calls recursive `getMax()` up to MAXRECURSION=5 depth. Handles special stones in simulation. Returns index of best move. |
| `Player` | Name, score, isComputer flag. |
| `InfoBar` | Displays two LCD score widgets, highlights active player. |
| `MainWindow` | Top-level container. Wires signals between PlayGround, InfoBar, MainMenu. Handles game over dialog. |
| `MainMenu` | Toolbar with popup menu (New Game, Configure, Quit, About) and status label. |
| `Configuration` | Reads/writes a config file with player names, AI flags, icon path. |
| `ConfigDialog` | Dialog for editing player names and AI toggles. |

Key behaviors from old code:
- Special stone values: Invert=10, Random=11, Skip=12
- `makeSpecial()` places specials at random positions (avoids overwriting existing specials via `getValue() > 9` check)
- Active line switches orientation on every pick (ROW↔COL), index = clicked stone's col (if row was active) or row (if col was active)
- Game over when newly activated line has zero non-empty stones
- Invert only affects stones with value < 10 (skips specials)
- Skip: same player goes again, but active line still switches
- Random: generates 1-9 positive/negative at click time
- AI: `getMax` finds the best stone in the line (ignoring specials for value comparison), negates value if it's opponent's move, recurses with `1/rec` depth discount

## Architecture Overview

### File Structure

```
znum/
├── index.html              — Single entry point, minimal shell
├── css/
│   └── styles.css          — All styles (grid, stones, menus, states)
├── js/
│   ├── app.js              — Entry point, router between screens
│   ├── model/
│   │   ├── constants.js    — Grid size, special stone types, AI depth
│   │   ├── stone.js        — Stone data (value, type, position, picked state)
│   │   ├── board.js        — 7x7 board: generate, get active line, pick, invert, clone
│   │   └── player.js       — Player data (name, score, isAI)
│   ├── game/
│   │   ├── game-state.js   — Full game state: board, players, activeLineType, activeLineIndex, currentPlayer, gameOver
│   │   ├── game-logic.js   — Pure functions: pick stone, apply effects, switch line, check game over, switch player
│   │   └── ai.js           — AI move selection (recursive look-ahead)
│   ├── network/
│   │   └── peer-manager.js — PeerJS wrapper: create/join game, send/receive moves, handle reconnection
│   ├── components/
│   │   ├── znum-app.js         — Top-level component, screen management
│   │   ├── main-menu.js        — Mode selection screen (Solo, Hot Seat, Network)
│   │   ├── player-setup.js     — Name input before game start
│   │   ├── game-board.js       — Renders the 7x7 grid
│   │   ├── game-stone.js       — Single stone element
│   │   ├── score-bar.js        — Player names, scores, turn indicator
│   │   ├── game-screen.js      — Composes board + score bar + status, game controller
│   │   ├── game-over-dialog.js — Win/lose/tie overlay with rematch option
│   │   └── network-lobby.js    — URL sharing / waiting for peer
│   └── utils/
│       └── storage.js      — LocalStorage helpers for player name
└── old/                    — Original C++ source (reference only)
```

### Design Principles

1. **Model/View separation** — Game state and logic are pure JS (no DOM). Components render state and dispatch user actions. This makes the AI and network play straightforward since they operate on the same state objects.

2. **Web Components without Shadow DOM** — Each component is a custom element (`HTMLElement` subclass) registered via `customElements.define()`. They use `this.innerHTML` or `this.appendChild` for rendering. No shadow DOM per requirements.

3. **Event-driven communication** — Components communicate via custom DOM events (bubbling up) and property/method calls (parent → child). The `game-screen` component acts as the controller, receiving user clicks and dispatching them to game logic.

4. **ES6 modules** — All files use `import`/`export`. The entry `index.html` has a single `<script type="module" src="js/app.js">`.

5. **CSS** — Modern CSS with nesting, custom properties for colors/sizing, CSS grid for the board layout. Minimal and functional.

## Detailed Module Design

### `constants.js`

```js
export const GRID_SIZE = 7;
export const SPECIAL_COUNT = 5;
export const STONE_INVERT = 'invert';
export const STONE_RANDOM = 'random';
export const STONE_SKIP = 'skip';
export const LINE_ROW = 'row';
export const LINE_COL = 'col';
export const AI_DEPTH = 3;
```

### `stone.js`

A stone is a plain object:
```js
{ value: Number (1-9), sign: +1/-1, type: 'normal'|'invert'|'random'|'skip', picked: Boolean }
```

Functions:
- `createStone(col, row)` — Random value 1-9, random sign, type='normal'
- `createSpecialStone(specialType)` — value=0, type=specialType
- `displayValue(stone)` — Returns display string (e.g., "+3", "-7", "INV", "RND", "SKP")
- `effectiveValue(stone)` — Returns `value * sign` for normal stones, 0 for specials

### `board.js`

The board is a flat `Array(49)` of stone objects, indexed as `row * GRID_SIZE + col`.

Functions:
- `createBoard()` — Generates 49 stones, then places 5 random specials
- `getStone(board, col, row)` — Returns stone at position
- `getActiveLine(board, lineType, lineIndex)` — Returns array of `{stone, col, row}` for the given row/col
- `hasAvailableStones(board, lineType, lineIndex)` — Checks if any unpicked stones exist in line
- `cloneBoard(board)` — Deep copy for AI simulation
- `invertBoard(board)` — Flips sign of all normal (unpicked) stones

### `player.js`

Plain object: `{ name: String, score: Number, isAI: Boolean }`

### `game-state.js`

Central state object:
```js
{
  board: Array(49),
  players: [player0, player1],
  currentPlayer: 0 | 1,
  activeLineType: 'row' | 'col',
  activeLineIndex: 0-6,
  gameOver: false,
  winner: null | 0 | 1 | 'tie',
  lastMove: { col, row, value, effect } | null,
  mode: 'solo' | 'hotseat' | 'network'
}
```

- `createGameState(player1, player2, mode)` — Initializes board, randomly picks active line and starting player

### `game-logic.js`

Pure functions that take a state and return a new state (immutable updates):

- `pickStone(state, col, row, randomValue?)` — Core game action:
  1. Mark stone as picked
  2. Apply stone effect (add score, or trigger invert/random/skip). For Random stones: if `randomValue` is provided (from network), use it; otherwise generate one (for local play)
  3. Switch active line (row↔col, index = clicked position's col or row)
  4. Determine next player (same player for Skip, otherwise switch)
  5. Check if new active line has available stones → game over if not
  6. Return new state + move description (including `randomValue` if generated, so the caller can transmit it)
- `getAvailableMoves(state)` — Returns list of `{col, row}` for unpicked stones in active line
- `isGameOver(state)` — Returns true if no stones available in active line
- `getWinner(state)` — Compares scores, returns 0, 1, or 'tie'

### `ai.js`

Ported from old `ArtificialIntelligence.cpp`, adapted to use the board model:

- `findBestMove(state)` — Returns `{col, row}` of the best move
  - Iterates available moves in active line
  - For each: simulates picking, calls `evaluate()` recursively
  - Returns move with highest score
- `evaluate(board, lineType, lineIndex, myScore, opponentScore, isMyTurn, depth)` — Recursive evaluation
  - Base case: depth >= AI_DEPTH or no moves → return heuristic
  - Finds best stone value in line (opponent's perspective negated)
  - Simulates pick, recurses with depth discount (1/depth factor)
  - Handles special stones (invert flips board, skip keeps same player, random = 0)

### `peer-manager.js`

Wraps PeerJS for network play:

- `createGame()` — Creates a Peer, returns the peer ID (used in shareable URL)
- `joinGame(peerId)` — Connects to existing peer
- `send(message)` — Sends a typed message to the peer (see protocol below)
- `onMessage(callback)` — Registers handler for incoming messages
- `onDisconnect(callback)` / `onReconnect(callback)` — Handle connectivity loss
- `destroy()` — Clean up peer connection

### Network Protocol

All messages are JSON objects with a `type` field. WebRTC data channels are **ordered and reliable** (like TCP), so messages always arrive in order. No sequence numbers or acknowledgements needed.

#### Message Types

| Type | Direction | Payload | Purpose |
|---|---|---|---|
| `player-info` | Guest → Host | `{ name }` | Guest sends their name after connecting |
| `game-start` | Host → Guest | `{ board, activeLineType, activeLineIndex, startingPlayer, hostName }` | Host sends the full initial board and game parameters. The board is serialized as an array of stone objects. This is the single source of truth for the initial state — the guest never generates its own board. |
| `move` | Both → Both | `{ col, row, randomValue? }` | A player picked a stone. `randomValue` (number, 1-9 with sign) is **only** included when the picked stone is a Random stone — the picking player generates the value and transmits it so both sides apply the same result. For all other stone types, the move is fully deterministic from the shared board state. |
| `rematch-request` | Both → Both | `{}` | Player wants to play again |
| `rematch-accept` | Both → Both | `{}` | Player accepts rematch |
| `game-start` | Host → Guest | *(same as above)* | Host sends new board for rematch |

#### Determinism & State Consistency

Both peers maintain their own `gameState` and run `game-logic.js` independently. This works because:

1. **The board is identical** — host generates it and sends it to the guest before the first move
2. **All game logic is deterministic** — given the same board and the same sequence of moves, both sides always compute the same resulting state
3. **The only non-deterministic operation is the Random stone** — solved by having the picking player generate the random value and include it in the `move` message. The receiving side passes this value into `pickStone()` instead of generating its own
4. **Message ordering is guaranteed** — WebRTC data channels deliver in order, so moves are always applied in the correct sequence
5. **Turns strictly alternate** (except Skip) — a player can only send a move when it's their turn, so there's no race condition

#### Input Gating

Each side only allows clicks when it's the local player's turn:
- **Local player's turn**: clicks are enabled, picking a stone immediately applies it locally via `pickStone()` and sends a `move` message to the peer
- **Remote player's turn**: clicks are disabled, the UI waits for an incoming `move` message, then applies it locally via `pickStone()`

This means there is **zero latency** for either player's own moves — they see the result instantly.

#### Validation (Safety Net)

On receiving a `move` message, the receiving side validates before applying:
1. Is it currently the remote player's turn?
2. Is the stone at `(col, row)` in the active line and not yet picked?

If validation fails, this indicates a bug (not a normal condition). The game shows an error state. In practice, this should never happen because both sides track the same state and input is gated by turn.

#### Reconnection

PeerJS supports reconnection via `peer.reconnect()`. On disconnect:
1. Show an overlay: "Opponent disconnected, waiting for reconnection..."
2. Game state is frozen (no moves possible)
3. On reconnect, the **host sends a `game-start` message with the current full game state** (board with picked flags, scores, active line, current player) so the guest can rebuild from it — this handles the case where the guest lost state (e.g., page refresh)
4. The overlay is dismissed and play resumes

#### Rematch Flow

1. Game ends → both sides show the game-over dialog with a "Rematch" button
2. Either player clicks "Rematch" → sends `rematch-request`
3. Other player sees "Opponent wants a rematch!" and clicks "Accept" → sends `rematch-accept`
4. Host generates a new board and sends `game-start` → new game begins
5. If the requesting player is the host and gets an accept, they generate and send immediately

### Components

#### `<znum-app>` — Top-level router
- Shows `<main-menu>` initially
- On mode selection → shows `<player-setup>` → then `<game-screen>`
- For network: shows `<network-lobby>` between setup and game
- Listens for "new-game" events to restart

#### `<main-menu>`
- Three buttons: Solo Play, Hot Seat, Network Play
- Dispatches `mode-selected` event with mode value

#### `<player-setup>`
- Input fields for player name(s)
- Loads/saves name from LocalStorage
- In solo mode: only one name input (AI name is "Computer")
- In network mode: only local player's name
- "Start Game" button → dispatches `players-ready` event

#### `<game-board>`
- CSS Grid 7x7 of `<game-stone>` elements
- Highlights active row/column (CSS class on active stones)
- Receives board state as property, re-renders on change

#### `<game-stone>`
- Displays stone value/type
- Clickable only when active and not picked
- Visual states: normal, active, picked (empty)
- Dispatches `stone-clicked` event with `{col, row}`

#### `<score-bar>`
- Shows both player names and scores
- Highlights current player's name/score
- Status message area (e.g., "Player 1's turn", "Invert activated!")

#### `<game-screen>` — Game controller component
- Composes `<score-bar>` + `<game-board>` + status area
- Holds the `gameState` object
- On `stone-clicked`:
  - **All modes**: calls `pickStone(state, col, row)` locally for instant feedback, re-renders
  - **Solo mode**: after player's turn, schedules AI move with a short delay
  - **Network mode**: sends `move` message (with `randomValue` if Random stone). On receiving a `move` from the peer, calls `pickStone()` with the received parameters. Clicks are only enabled when it's the local player's turn.
- Shows a "Waiting for reconnection..." overlay when the peer disconnects
- On game over: shows `<game-over-dialog>`

#### `<game-over-dialog>`
- Shows winner name or "It's a tie!"
- "New Game" and "Back to Menu" buttons
- In network mode: "Rematch" button that sends rematch request to peer

#### `<network-lobby>`
- Host view: shows shareable URL, "Waiting for opponent..."
- Join view: shows "Connecting..." → auto-starts game when connected
- URL format: `?join=<peerId>`

### CSS Design

```css
:root {
  --color-active: #4caf50;
  --color-inactive: #e0e0e0;
  --color-positive: #1b5e20;
  --color-negative: #b71c1c;
  --color-special: #ff6f00;
  --color-picked: #9e9e9e;
  --grid-size: 7;
  --stone-size: 60px;
}
```

- Board: `display: grid; grid-template: repeat(7, var(--stone-size)) / repeat(7, var(--stone-size))`
- Active line stones: `background: var(--color-active)` with cursor pointer
- Picked stones: dimmed/empty appearance, no pointer events
- Positive values: green text; negative: red text
- Special stones: distinct label text (INV, RND, SKP) with orange background
- Turn indicator: bold/highlighted current player in score bar

### Network Play Flow

1. **Host creates game**: Click "Network Play" → enter name → `createGame()` returns peer ID → display URL with `?join=<peerId>` → wait in lobby
2. **Guest joins**: Opens URL → extracts `peerId` from query param → enter name → `joinGame(peerId)` → sends `player-info` with name
3. **Game starts**: Host generates the full game state (board, starting player, active line) → sends `game-start` message → both sides construct their local `gameState` from the same data and render
4. **Turn flow**: Active player picks stone → `pickStone()` applied locally (instant feedback) → `move` message sent to peer (includes `randomValue` if Random stone) → peer receives `move`, applies same `pickStone()` locally with same parameters → both states stay in sync
5. **Reconnection**: On disconnect → overlay "Opponent disconnected, waiting..." → game frozen → on reconnect, host re-sends `game-start` with full current state → guest rebuilds → play resumes
6. **Rematch**: Either player sends `rematch-request` → other sees prompt and sends `rematch-accept` → host generates new board → sends `game-start` → new game begins

## Verification

Each implementation step must be manually verified in a real browser using the Playwright MCP before moving on to the next step.

### Setup

Start a local web server from the project root using Python:

```sh
python3 -m http.server 8000 --directory /home/andi/projects/znum
```

The game is then accessible at `http://localhost:8000`.

### Per-Step Verification

After completing each step, use the Playwright MCP to:

1. Navigate to `http://localhost:8000`
2. Visually confirm the expected UI elements are present and rendered correctly
3. Interact with the new functionality (click buttons, pick stones, etc.)
4. Verify the behavior matches the requirements (correct scores, correct active line switching, game over detection, etc.)
5. Check the browser console (via Playwright) for any JS errors or warnings

### What to Check per Step

| Step | Verification |
|---|---|
| Step 1: Skeleton | Page loads without errors, `<znum-app>` element is in the DOM |
| Step 2: Model | No UI yet — verify via browser console: import modules, call `createBoard()`, `createGameState()`, `pickStone()` and inspect results |
| Step 3: Core UI | Board renders as a 7x7 grid, stones show values, active line is visually highlighted |
| Step 4: Hot Seat | Full game playable: click stones, scores update, turns alternate, active line switches, game over dialog appears, new game works, names persist in LocalStorage |
| Step 5: AI | Solo mode: AI makes moves after human turn, game plays to completion, AI doesn't pick invalid stones |
| Step 6: Network | Open two browser tabs: host creates game, copy URL to second tab, guest joins, moves sync between tabs, reconnection overlay appears on disconnect, rematch works |
| Step 7: Polish | Special stone effects visible (invert message, random value shown, skip notification), all edge cases handled |

## Implementation Steps

### Step 1: Project Skeleton
- Create `index.html` with minimal markup (`<znum-app>`) and module script tag
- Create `css/styles.css` with CSS custom properties and basic reset
- Create `js/app.js` that imports and registers the `<znum-app>` component
- Create `js/components/znum-app.js` as empty shell

### Step 2: Game Model
- Implement `js/model/constants.js`
- Implement `js/model/stone.js` (stone creation, display, value helpers)
- Implement `js/model/board.js` (board creation, get/set, active line, clone, invert)
- Implement `js/model/player.js` (player creation)
- Implement `js/game/game-state.js` (state factory)
- Implement `js/game/game-logic.js` (pickStone, getAvailableMoves, isGameOver, getWinner)

### Step 3: Core UI Components
- Implement `js/components/game-stone.js` — renders a single stone, click handling
- Implement `js/components/game-board.js` — renders 7x7 grid of `<game-stone>`
- Implement `js/components/score-bar.js` — player names, scores, turn indicator
- Write CSS for grid layout, stone states, active line highlighting

### Step 4: Game Screen & Hot Seat Mode
- Implement `js/components/game-screen.js` — controller that wires board + score bar + game logic
- Implement `js/components/game-over-dialog.js`
- Implement `js/components/main-menu.js` — mode selection
- Implement `js/components/player-setup.js` — name input with LocalStorage
- Implement `js/utils/storage.js`
- Wire up `<znum-app>` to navigate between menu → setup → game → game over
- Hot Seat mode fully playable at this point

### Step 5: AI (Solo Play)
- Implement `js/game/ai.js` — port the recursive look-ahead from old `ArtificialIntelligence.cpp`
- Integrate into `game-screen.js`: after human turn, trigger AI with a short delay
- Solo mode fully playable at this point

### Step 6: Network Play
- Implement `js/network/peer-manager.js` — PeerJS wrapper
- Implement `js/components/network-lobby.js` — URL sharing, waiting screen
- Integrate into `game-screen.js`: send moves, receive moves, handle turns
- Add reconnection handling with "waiting" overlay
- Add rematch flow in `game-over-dialog.js`
- Add PeerJS library via CDN import in `index.html`

### Step 7: Polish & Edge Cases
- Handle all special stone visual effects (brief animation/message for invert, random result display, skip notification)
- Ensure game over detection works correctly in all edge cases
- Test AI behavior matches requirements (depth discounting, special stone handling)
- Verify LocalStorage persistence for player names
- Test network play: creation, joining, disconnection, reconnection, rematch
- Cross-browser testing with ES modules

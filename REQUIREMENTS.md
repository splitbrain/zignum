# ZNum Game

The goal of this project is to recreate an old game (sources in old/) using modern web technologies.

## Rules

ZNum is a turn-based number puzzle game played on a 7x7 grid.

### Setup
- The game board consists of 49 stones arranged in a 7x7 grid
- Each stone has a value from 1 to 9 (positive or negative), randomly assigned (50/50 chance for positive/negative)
- 5 special stones are randomly placed on the board (randomly chosen from the 3 types below), replacing 5 regular stones:
  - **Invert**: Reverses the sign of all stones on the board (positive becomes negative and vice versa)
  - **Random**: Generates a new random value (1-9, positive or negative) for the player's score (no extra turn)
  - **Skip**: The current player gets another turn (opponent's turn is skipped). The active line still switches after picking this stone.

### Gameplay
1. At the start of the game, one row OR one column is randomly selected and highlighted as "active" (green background)
2. Players can only select stones from the active row or column
3. On their turn, a player clicks one of the active stones:
   - The stone's value is added to the player's score
   - The selected stone is removed from play
4. After selecting a stone, the active line switches:
   - If a row was active, the column corresponding to the clicked stone's position becomes active
   - If a column was active, the row corresponding to the clicked stone's position becomes active
5. Special stones trigger their unique effect when collected

### Winning
- The game ends when no stones remain in the active row/column
- The player with the highest total score wins
- If scores are equal, the result is a tie ("Nobody wins")


## Game Modes

The game should provide the following modes:

### Solo Play (Against Computer)

There is only one human player, the other player's turns are taken by an "Artificial Intelligence". The first player is determined randomly. The AI uses a look-ahead evaluation algorithm to decide on its next move:

1. **Recursion Depth**: The AI uses a configurable depth constant (default: 3) for its look-ahead simulation

2. **Move Evaluation**: For each available stone in the active row/column, the AI simulates picking that stone and evaluates the resulting game state.

3. **Recursive Look-Ahead**: The AI uses recursive simulation to explore possible future moves. It looks multiple moves ahead (up to a maximum recursion depth), alternating between assuming its own moves and the opponent's moves.

4. **Scoring**: Each move's value is calculated by accumulating:
   - The stone's numerical value (1-9, positive or negative)
   - The expected value of future moves from the simulated game state

5. **Special Stone Handling**:
   - **Invert**: Reverses the sign of all remaining stones on the board, affecting future move evaluations
   - **Skip**: The AI recognizes this grants an extra turn, so it continues evaluating from the same player's perspective
   - **Random**: Treated as zero value (the outcome is random but probably better than picking a negative stone)

6. **Decision Making**: The AI selects the move with the highest calculated value. When no stones exist in the active line, the AI returns a large positive value (+100) if winning or a large negative value (-100) if losing.

7. **Depth Discounting**: Future move values are weighted by a decreasing factor (1/depth) to prioritize immediate gains over distant ones.

The AI essentially performs a bounded depth-first search through the game tree, using a simplified evaluation function to determine the most advantageous move at each step.

### Hot Seat

Two human players play on the same device. They take control of the input depending on their turn.

### Network Play

This is a new game mode that was not implemented in the original. When a player selects this option a unique URL is generated. The player can share this URL with the second player. Once the second player opens that URL, both players get connected and the game begins.

At the end of the game, both players have the option to ask for a rematch which starts a new game reusing the same connection.

The connection needs to be robust against network connectivity loss. If a player disconnects, the game pauses and waits for reconnection.

## General Gameplay Requirements

Players should be able to pick their name which should be saved in LocalStorage.

It should always be clear whose turn it is. The current scores need to be always visible.

## Technical Requirements

The game should be implemented using modern web technology:

  * Web Components for encapsulation (no shadow DOM, though)
  * ES6 modules directly in the browser (no build pipeline)
  * Modern CSS (nesting, grid layout, custom properties)

For network play, the [PeerJS library](https://peerjs.com/) shall be used. Other dependencies should be avoided if possible.

The first implementation should focus on functionality, not Design. The HTML/CSS should be kept as minimal as possible.

The old implementation in old/ can be used as reference but does not need to be copied in terms of architecture. Instead a logical modern architecture using common practice and patterns shall be chosen.




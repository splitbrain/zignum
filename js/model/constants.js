/** Number of rows and columns on the board. */
export const GRID_SIZE = 7;
/** Number of special stones placed on each new board. */
export const SPECIAL_COUNT = 5;
/** Stone type: inverts the sign of all normal stones on the board. */
export const STONE_INVERT = 'invert';
/** Stone type: adds a random value to the picker's score. */
export const STONE_RANDOM = 'random';
/** Stone type: the current player gets another turn. */
export const STONE_SKIP = 'skip';
/** All special stone types. */
export const SPECIAL_TYPES = [STONE_INVERT, STONE_RANDOM, STONE_SKIP];
/** Active line type: a row. */
export const LINE_ROW = 'row';
/** Active line type: a column. */
export const LINE_COL = 'col';
/** Maximum look-ahead depth for the AI minimax search. */
export const AI_DEPTH = 3;

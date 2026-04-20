export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 2

export const BOARD_ROWS = 8
export const BOARD_COLS = 5

export const TURN_TIME_LIMIT = 0
export const TURN_TIME_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: 'No limit', value: 0 },
]

export const GAME_STATES = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
}

export const PIECES = {
  KING: 'K',
  QUEEN: 'Q',
  ROOK: 'R',
  BISHOP: 'B',
  KNIGHT: 'N',
  PAWN: 'P',
}

export const COLORS = {
  WHITE: 'w',
  BLACK: 'b',
}

// Back rank: Rook, Knight, King, Queen, Bishop (files 0-4)
// King in the middle, queen & bishop flanking, knight & rook at the ends
export const INITIAL_BOARD = (() => {
  const board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))

  // Black back rank (row 0)
  board[0][0] = { type: 'R', color: 'b' }
  board[0][1] = { type: 'N', color: 'b' }
  board[0][2] = { type: 'K', color: 'b' }
  board[0][3] = { type: 'Q', color: 'b' }
  board[0][4] = { type: 'B', color: 'b' }

  // Black pawns (row 1)
  for (let c = 0; c < BOARD_COLS; c++) {
    board[1][c] = { type: 'P', color: 'b' }
  }

  // White pawns (row 6)
  for (let c = 0; c < BOARD_COLS; c++) {
    board[6][c] = { type: 'P', color: 'w' }
  }

  // White back rank (row 7)
  board[7][0] = { type: 'R', color: 'w' }
  board[7][1] = { type: 'N', color: 'w' }
  board[7][2] = { type: 'K', color: 'w' }
  board[7][3] = { type: 'Q', color: 'w' }
  board[7][4] = { type: 'B', color: 'w' }

  return board
})()

export const PIECE_UNICODE = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
}

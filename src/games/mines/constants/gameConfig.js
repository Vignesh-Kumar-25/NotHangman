export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6

export const DEFAULT_BOARD_ROWS = 10
export const DEFAULT_BOARD_COLS = 10
export const DEFAULT_BOMB_COUNT = 15
export const DEFAULT_TURN_TIME_LIMIT = 30
export const DEFAULT_NUM_ROUNDS = 3

export const BOARD_SIZE_OPTIONS = [
  { label: '8\u00d78', rows: 8, cols: 8 },
  { label: '10\u00d710', rows: 10, cols: 10 },
  { label: '12\u00d712', rows: 12, cols: 12 },
  { label: '16\u00d716', rows: 16, cols: 16 },
]

export const BOMB_PRESETS = [10, 15, 20, 25, 30]

export const TURN_TIME_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: 'No limit', value: 0 },
]

export const GAME_STATES = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  ROUND_OVER: 'round_over',
  FINISHED: 'finished',
}

export const NUMBER_COLORS = [
  null,
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#7c3aed',
  '#f97316',
  '#06b6d4',
  '#ec4899',
  '#6b7280',
]

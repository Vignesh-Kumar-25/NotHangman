export const TILE_SIZE = 80
export const TILE_GAP = 6
export const BOARD_PADDING = 20
export const TILE_RADIUS = 12
export const BOARD_SIZE = 5

export const GRID_WIDTH = BOARD_SIZE * TILE_SIZE + (BOARD_SIZE - 1) * TILE_GAP + 2 * BOARD_PADDING
export const GRID_HEIGHT = GRID_WIDTH

export const COLORS = {
  tileBg: 0x2a2a4a,
  tileBgHover: 0x3a3a6a,
  tileSelected: 0x4a6fa5,
  tileHint: 0xf0c040,
  tileBorder: 0x3a3a6e,
  letterText: 0xffffff,
  valueText: 0xaaaacc,
  trailLine: 0x6eb5ff,
  trailGlow: 0x3a8aff,
  multiplierDL: 0x4a9eff,
  multiplierTL: 0xff5555,
  multiplierWord2x: 0xffc040,
  gemColor: 0xe040e0,
  background: 0x1a1a2e,
}

export const FONTS = {
  letter: { fontFamily: 'Arial', fontSize: 32, fontWeight: 'bold', fill: COLORS.letterText },
  value: { fontFamily: 'Arial', fontSize: 12, fill: COLORS.valueText },
  multiplier: { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold' },
}

import { LETTER_VALUES, MULTIPLIER_TYPES } from '../constants/letterConfig'
import { LONG_WORD_THRESHOLD, LONG_WORD_BONUS } from '../constants/gameConfig'

export function scoreWord(path, board) {
  let letterSum = 0
  let hasWordMultiplier = false

  for (const { row, col } of path) {
    const tile = board[row][col]
    let tileScore = LETTER_VALUES[tile.letter] || 0

    if (tile.multiplier === MULTIPLIER_TYPES.DL) {
      tileScore *= 2
    } else if (tile.multiplier === MULTIPLIER_TYPES.TL) {
      tileScore *= 3
    }

    if (tile.multiplier === MULTIPLIER_TYPES.WORD_2X) {
      hasWordMultiplier = true
    }

    letterSum += tileScore
  }

  let total = hasWordMultiplier ? letterSum * 2 : letterSum

  if (path.length >= LONG_WORD_THRESHOLD) {
    total += LONG_WORD_BONUS
  }

  return total
}

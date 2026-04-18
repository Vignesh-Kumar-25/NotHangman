import { MAX_GEMS } from '../constants/gameConfig'

export function countGemsEarned(path, board) {
  let count = 0
  for (const { row, col } of path) {
    if (board[row][col].gem) count++
  }
  return count
}

export function canAfford(currentGems, cost) {
  return currentGems >= cost
}

export function earnGems(currentGems, earned) {
  return Math.min(MAX_GEMS, currentGems + earned)
}

export function spendGems(currentGems, cost) {
  return currentGems - cost
}

import { BOARD_SIZE } from '../constants/gameConfig'
import { scoreWord } from './scoringUtils'
import { hasPrefix } from './dictionaryUtils'

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

const MAX_PATH_LENGTH = 10

export function findBestWord(board, dictionary, trie) {
  let bestScore = 0
  let bestPath = null
  let bestWord = ''

  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))

  function dfs(row, col, path, word) {
    if (word.length >= 2 && dictionary.has(word)) {
      const score = scoreWord(path, board)
      if (score > bestScore) {
        bestScore = score
        bestPath = [...path]
        bestWord = word
      }
    }

    if (path.length >= MAX_PATH_LENGTH) return

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (visited[nr][nc]) continue

      const nextWord = word + board[nr][nc].letter
      if (!hasPrefix(trie, nextWord)) continue

      visited[nr][nc] = true
      path.push({ row: nr, col: nc })
      dfs(nr, nc, path, nextWord)
      path.pop()
      visited[nr][nc] = false
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const letter = board[r][c].letter
      if (!hasPrefix(trie, letter)) continue
      visited[r][c] = true
      dfs(r, c, [{ row: r, col: c }], letter)
      visited[r][c] = false
    }
  }

  return bestPath ? { path: bestPath, word: bestWord, score: bestScore } : null
}

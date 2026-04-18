import { LETTER_POOL, LETTER_VALUES, MULTIPLIER_TYPES } from '../constants/letterConfig'
import { BOARD_SIZE, GEM_TILES_PER_BOARD, DL_TILES_PER_BOARD, TL_TILES_PER_BOARD, MIN_WORD_LENGTH } from '../constants/gameConfig'
import { loadDictionary, hasPrefix } from './dictionaryUtils'

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])
const MAX_VOWELS_PER_ROW = 3
const MAX_SAME_LETTER_PER_ROW = 2
const MAX_BOARD_ATTEMPTS = 200
const MAX_PATH_LENGTH = 10

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

function getWeightedRandomLetter() {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
}

function createTile(letter) {
  return {
    letter,
    value: LETTER_VALUES[letter] || 0,
    multiplier: null,
    gem: false,
  }
}

function getRandomPositions(board, count, exclude = new Set()) {
  const available = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = `${r},${c}`
      if (!exclude.has(key) && !board[r][c].multiplier && !board[r][c].gem) {
        available.push({ row: r, col: c })
      }
    }
  }
  const shuffled = available.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateCandidateBoard(round) {
  const board = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = []
    let vowelCount = 0
    const letterCounts = {}
    for (let c = 0; c < BOARD_SIZE; c++) {
      let letter
      let attempts = 0
      do {
        letter = getWeightedRandomLetter()
        attempts++
      } while (attempts < 30 && (
        (VOWELS.has(letter) && vowelCount >= MAX_VOWELS_PER_ROW) ||
        ((letterCounts[letter] || 0) >= MAX_SAME_LETTER_PER_ROW)
      ))
      if (VOWELS.has(letter)) vowelCount++
      letterCounts[letter] = (letterCounts[letter] || 0) + 1
      row.push(createTile(letter))
    }
    board.push(row)
  }

  const placed = new Set()

  const dlPositions = getRandomPositions(board, DL_TILES_PER_BOARD, placed)
  for (const { row, col } of dlPositions) {
    board[row][col].multiplier = MULTIPLIER_TYPES.DL
    placed.add(`${row},${col}`)
  }

  const tlPositions = getRandomPositions(board, TL_TILES_PER_BOARD, placed)
  for (const { row, col } of tlPositions) {
    board[row][col].multiplier = MULTIPLIER_TYPES.TL
    placed.add(`${row},${col}`)
  }

  if (round >= 2) {
    const wxPositions = getRandomPositions(board, 1, placed)
    for (const { row, col } of wxPositions) {
      board[row][col].multiplier = MULTIPLIER_TYPES.WORD_2X
      placed.add(`${row},${col}`)
    }
  }

  const gemPositions = getRandomPositions(board, GEM_TILES_PER_BOARD, placed)
  for (const { row, col } of gemPositions) {
    board[row][col].gem = true
  }

  return board
}

function solveBoard(board, trie, dictionary) {
  const words = new Set()
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))

  function dfs(row, col, word) {
    if (word.length >= MIN_WORD_LENGTH && dictionary.has(word)) {
      words.add(word)
    }
    if (word.length >= MAX_PATH_LENGTH) return

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (visited[nr][nc]) continue
      const nextWord = word + board[nr][nc].letter
      if (!hasPrefix(trie, nextWord)) continue
      visited[nr][nc] = true
      dfs(nr, nc, nextWord)
      visited[nr][nc] = false
    }
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const letter = board[r][c].letter
      if (!hasPrefix(trie, letter)) continue
      visited[r][c] = true
      dfs(r, c, letter)
      visited[r][c] = false
    }
  }

  return words
}

function evaluateBoardQuality(words) {
  if (words.size < 10) return { acceptable: false }

  let longWords = 0
  let hasLongerWord = false
  for (const word of words) {
    if (word.length >= 4) longWords++
    if (word.length >= 5) hasLongerWord = true
  }

  return { acceptable: longWords >= 2 && hasLongerWord }
}

export function hasAnyValidMove(board, trie, dictionary) {
  const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false))

  function dfs(row, col, word) {
    if (word.length >= MIN_WORD_LENGTH && dictionary.has(word)) return true
    if (word.length >= MAX_PATH_LENGTH) return false

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr
      const nc = col + dc
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue
      if (visited[nr][nc]) continue
      const nextWord = word + board[nr][nc].letter
      if (!hasPrefix(trie, nextWord)) continue
      visited[nr][nc] = true
      if (dfs(nr, nc, nextWord)) return true
      visited[nr][nc] = false
    }
    return false
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const letter = board[r][c].letter
      if (!hasPrefix(trie, letter)) continue
      visited[r][c] = true
      if (dfs(r, c, letter)) return true
      visited[r][c] = false
    }
  }
  return false
}

export function generateBoard(round) {
  const { dictionary, trie } = loadDictionary()

  let bestBoard = null
  let bestWordCount = 0

  for (let attempt = 0; attempt < MAX_BOARD_ATTEMPTS; attempt++) {
    const board = generateCandidateBoard(round)
    const words = solveBoard(board, trie, dictionary)
    const quality = evaluateBoardQuality(words)

    if (quality.acceptable) return board

    if (words.size > bestWordCount) {
      bestBoard = board
      bestWordCount = words.size
    }
  }

  return bestBoard || generateCandidateBoard(round)
}

export function replaceTiles(board, usedPositions) {
  const { dictionary, trie } = loadDictionary()
  const newBoard = board.map(row => row.map(tile => ({ ...tile })))

  for (const { row, col } of usedPositions) {
    newBoard[row][col] = createTile(getWeightedRandomLetter())
  }

  if (hasAnyValidMove(newBoard, trie, dictionary)) return newBoard

  for (let attempt = 0; attempt < 50; attempt++) {
    for (const { row, col } of usedPositions) {
      newBoard[row][col] = createTile(getWeightedRandomLetter())
    }
    if (hasAnyValidMove(newBoard, trie, dictionary)) return newBoard
  }

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      newBoard[r][c].letter = getWeightedRandomLetter()
      newBoard[r][c].value = LETTER_VALUES[newBoard[r][c].letter] || 0
    }
  }
  return newBoard
}

function doShuffle(board) {
  const newBoard = board.map(row => row.map(tile => ({ ...tile })))
  const letters = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      letters.push(newBoard[r][c].letter)
    }
  }
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[letters[i], letters[j]] = [letters[j], letters[i]]
  }
  let idx = 0
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      newBoard[r][c].letter = letters[idx]
      newBoard[r][c].value = LETTER_VALUES[letters[idx]] || 0
      idx++
    }
  }
  return newBoard
}

export function shuffleBoard(board) {
  const { dictionary, trie } = loadDictionary()

  for (let attempt = 0; attempt < 20; attempt++) {
    const newBoard = doShuffle(board)
    if (hasAnyValidMove(newBoard, trie, dictionary)) return newBoard
  }

  return doShuffle(board)
}

export function swapTileLetter(board, row, col, newLetter) {
  const newBoard = board.map(r => r.map(tile => ({ ...tile })))
  newBoard[row][col].letter = newLetter.toUpperCase()
  newBoard[row][col].value = LETTER_VALUES[newLetter.toUpperCase()] || 0
  return newBoard
}

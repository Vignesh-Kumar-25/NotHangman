import { LETTER_POOL, LETTER_VALUES, MULTIPLIER_TYPES } from '../constants/letterConfig'
import { BOARD_SIZE, GEM_TILES_PER_BOARD, DL_TILES_PER_BOARD, TL_TILES_PER_BOARD } from '../constants/gameConfig'

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

export function generateBoard(round) {
  const board = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = []
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(createTile(getWeightedRandomLetter()))
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

export function replaceTiles(board, usedPositions) {
  const newBoard = board.map(row => row.map(tile => ({ ...tile })))
  for (const { row, col } of usedPositions) {
    newBoard[row][col] = createTile(getWeightedRandomLetter())
  }
  return newBoard
}

export function shuffleBoard(board) {
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

export function swapTileLetter(board, row, col, newLetter) {
  const newBoard = board.map(r => r.map(tile => ({ ...tile })))
  newBoard[row][col].letter = newLetter.toUpperCase()
  newBoard[row][col].value = LETTER_VALUES[newLetter.toUpperCase()] || 0
  return newBoard
}

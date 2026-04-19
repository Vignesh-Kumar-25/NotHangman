import { BOARD_ROWS, BOARD_COLS } from '../constants/gameConfig'

export function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? { ...cell } : null))
}

export function boardToFlat(board) {
  const flat = {}
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c]
      if (piece) {
        flat[`${r}_${c}`] = piece
      }
    }
  }
  return flat
}

export function flatToBoard(flat) {
  const board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))
  if (!flat) return board
  for (const [key, piece] of Object.entries(flat)) {
    const [r, c] = key.split('_').map(Number)
    board[r][c] = piece
  }
  return board
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS
}

function findKing(board, color) {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c]
      if (p && p.type === 'K' && p.color === color) return { r, c }
    }
  }
  return null
}

function isSquareAttackedBy(board, r, c, attackerColor) {
  for (let ar = 0; ar < BOARD_ROWS; ar++) {
    for (let ac = 0; ac < BOARD_COLS; ac++) {
      const p = board[ar][ac]
      if (!p || p.color !== attackerColor) continue
      const moves = getRawMoves(board, ar, ac)
      if (moves.some(m => m.r === r && m.c === c)) return true
    }
  }
  return false
}

function getRawMoves(board, row, col) {
  const piece = board[row][col]
  if (!piece) return []
  const { type, color } = piece
  const moves = []

  const addIfValid = (r, c) => {
    if (!inBounds(r, c)) return false
    const target = board[r][c]
    if (target && target.color === color) return false
    moves.push({ r, c })
    return !target
  }

  const addSliding = (dr, dc) => {
    let r = row + dr, c = col + dc
    while (inBounds(r, c)) {
      const target = board[r][c]
      if (target) {
        if (target.color !== color) moves.push({ r, c })
        break
      }
      moves.push({ r, c })
      r += dr
      c += dc
    }
  }

  switch (type) {
    case 'K':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          addIfValid(row + dr, col + dc)
        }
      }
      break

    case 'Q':
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) {
        addSliding(dr, dc)
      }
      break

    case 'R':
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        addSliding(dr, dc)
      }
      break

    case 'B':
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        addSliding(dr, dc)
      }
      break

    case 'N': {
      const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]
      for (const [dr, dc] of knightMoves) {
        addIfValid(row + dr, col + dc)
      }
      break
    }

    case 'P': {
      const dir = color === 'w' ? -1 : 1
      const startRow = color === 'w' ? 6 : 1

      // Forward one
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        moves.push({ r: row + dir, c: col })
        // Forward two from starting row
        if (row === startRow && !board[row + 2 * dir][col]) {
          moves.push({ r: row + 2 * dir, c: col })
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const nr = row + dir, nc = col + dc
        if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc].color !== color) {
          moves.push({ r: nr, c: nc })
        }
      }
      break
    }
  }

  return moves
}

export function isInCheck(board, color) {
  const king = findKing(board, color)
  if (!king) return false
  const opponentColor = color === 'w' ? 'b' : 'w'
  return isSquareAttackedBy(board, king.r, king.c, opponentColor)
}

export function getLegalMoves(board, row, col) {
  const piece = board[row][col]
  if (!piece) return []
  const rawMoves = getRawMoves(board, row, col)

  return rawMoves.filter(move => {
    const testBoard = cloneBoard(board)
    testBoard[move.r][move.c] = testBoard[row][col]
    testBoard[row][col] = null
    return !isInCheck(testBoard, piece.color)
  })
}

export function hasAnyLegalMoves(board, color) {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c]
      if (p && p.color === color) {
        if (getLegalMoves(board, r, c).length > 0) return true
      }
    }
  }
  return false
}

export function getGameStatus(board, currentTurnColor) {
  const inCheck = isInCheck(board, currentTurnColor)
  const hasLegal = hasAnyLegalMoves(board, currentTurnColor)

  if (!hasLegal && inCheck) return 'checkmate'
  if (!hasLegal && !inCheck) return 'stalemate'
  if (inCheck) return 'check'
  return 'normal'
}

export function applyMove(board, fromR, fromC, toR, toC, promotionType) {
  const newBoard = cloneBoard(board)
  const piece = { ...newBoard[fromR][fromC] }
  const captured = newBoard[toR][toC]

  // Promotion
  if (piece.type === 'P') {
    const promoRank = piece.color === 'w' ? 0 : BOARD_ROWS - 1
    if (toR === promoRank) {
      piece.type = promotionType || 'Q'
    }
  }

  newBoard[toR][toC] = piece
  newBoard[fromR][fromC] = null

  return { board: newBoard, captured }
}

export function needsPromotion(board, fromR, fromC, toR) {
  const piece = board[fromR][fromC]
  if (!piece || piece.type !== 'P') return false
  const promoRank = piece.color === 'w' ? 0 : BOARD_ROWS - 1
  return toR === promoRank
}

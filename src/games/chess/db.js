import { ref, set, get, update, onDisconnect } from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import { GAME_STATES, INITIAL_BOARD, COLORS, TURN_TIME_LIMIT } from './constants/gameConfig'
import { boardToFlat, flatToBoard, applyMove, getGameStatus, getLegalMoves, needsPromotion } from './utils/chessLogic'

export async function createRoom(uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in')
  let roomCode
  let attempts = 0
  while (attempts < 10) {
    roomCode = generateRoomCode()
    const snap = await get(ref(db, `rooms/${roomCode}`))
    if (!snap.exists()) break
    attempts++
  }

  const now = Date.now()
  await set(ref(db, `rooms/${roomCode}`), {
    meta: {
      hostUid: uid,
      createdAt: now,
      status: 'lobby',
      roomCode,
      gameType: 'chess',
      turnTimeLimit: TURN_TIME_LIMIT,
    },
    players: {
      [uid]: {
        uid, username, avatarId,
        joinedAt: now, connected: true,
      },
    },
    playerOrder: [uid],
    game: { state: GAME_STATES.LOBBY },
  })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
  return roomCode
}

export async function joinRoom(roomCode, uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in')
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) throw new Error('Room not found')
  const room = snap.val()
  if (room.meta.gameType !== 'chess') throw new Error('This is not a Mini Chess room')
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')

  const existingPlayers = room.players || {}
  if (existingPlayers[uid]) {
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), { connected: true })
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  if (Object.keys(existingPlayers).length >= 2) throw new Error('Room is full (max 2)')

  const now = Date.now()
  const order = Array.isArray(room.playerOrder) ? room.playerOrder : Object.values(room.playerOrder || {})
  await update(roomRef, {
    [`players/${uid}`]: {
      uid, username, avatarId,
      joinedAt: now, connected: true,
    },
    playerOrder: [...order, uid],
  })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
}

export async function leaveRoom(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()

  if (room.meta.status === 'lobby') {
    const order = Array.isArray(room.playerOrder) ? room.playerOrder : Object.values(room.playerOrder || {})
    const newOrder = order.filter((id) => id !== uid)
    const updates = { [`players/${uid}`]: null, playerOrder: newOrder }
    if (room.meta.hostUid === uid && newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
    }
    if (newOrder.length === 0) {
      await set(roomRef, null)
      return
    }
    await update(roomRef, updates)
  } else {
    const updates = { [`players/${uid}/connected`]: false }
    const order = Array.isArray(room.playerOrder) ? room.playerOrder : Object.values(room.playerOrder || {})
    const connectedOthers = order.filter(
      (id) => id !== uid && room.players?.[id]?.connected !== false
    )
    if (room.meta.hostUid === uid && connectedOthers.length > 0) {
      updates['meta/hostUid'] = connectedOthers[0]
    }
    await update(roomRef, updates)
  }
}

export async function updateSettings(roomCode, settings) {
  const allowed = ['turnTimeLimit']
  const updates = {}
  for (const key of allowed) {
    if (settings[key] !== undefined) updates[key] = settings[key]
  }
  await update(ref(db, `rooms/${roomCode}/meta`), updates)
}

export async function startGame(roomCode, playerOrder) {
  const flatBoard = boardToFlat(INITIAL_BOARD)
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'playing',
    game: {
      state: GAME_STATES.PLAYING,
      board: flatBoard,
      currentTurn: COLORS.WHITE,
      whiteUid: playerOrder[0],
      blackUid: playerOrder[1],
      turnStartedAt: Date.now(),
      status: 'normal',
      capturedWhite: null,
      capturedBlack: null,
      lastMove: null,
      moveCount: 0,
      winner: null,
    },
  })
}

export async function makeMove(roomCode, uid, fromR, fromC, toR, toC, promotionType) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()

  const { game } = room
  if (game.state !== GAME_STATES.PLAYING) return

  const myColor = game.whiteUid === uid ? 'w' : game.blackUid === uid ? 'b' : null
  if (!myColor || game.currentTurn !== myColor) return

  const board = flatToBoard(game.board)
  const piece = board[fromR][fromC]
  if (!piece || piece.color !== myColor) return

  const legalMoves = getLegalMoves(board, fromR, fromC)
  if (!legalMoves.some(m => m.r === toR && m.c === toC)) return

  if (needsPromotion(board, fromR, fromC, toR) && !promotionType) return

  const { board: newBoard, captured } = applyMove(board, fromR, fromC, toR, toC, promotionType)
  const nextColor = myColor === 'w' ? 'b' : 'w'
  const gameStatus = getGameStatus(newBoard, nextColor)

  const updates = {}
  updates['game/board'] = boardToFlat(newBoard)
  updates['game/lastMove'] = { fromR, fromC, toR, toC, piece: piece.type, color: myColor, captured: !!captured, timestamp: Date.now() }
  updates['game/moveCount'] = (game.moveCount || 0) + 1
  updates['game/turnStartedAt'] = Date.now()

  if (captured) {
    const captureKey = myColor === 'w' ? 'capturedWhite' : 'capturedBlack'
    const prevCaptured = game[captureKey] || []
    const arr = Array.isArray(prevCaptured) ? prevCaptured : Object.values(prevCaptured)
    updates[`game/${captureKey}`] = [...arr, captured.type]
  }

  if (gameStatus === 'checkmate') {
    updates['game/status'] = 'checkmate'
    updates['game/winner'] = myColor
    updates['game/currentTurn'] = nextColor
  } else if (gameStatus === 'stalemate') {
    updates['game/status'] = 'stalemate'
    updates['game/winner'] = 'draw'
    updates['game/currentTurn'] = nextColor
  } else {
    updates['game/status'] = gameStatus
    updates['game/currentTurn'] = nextColor
  }

  await update(roomRef, updates)
}

export async function finishGame(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()
  if (room.game?.state === GAME_STATES.GAME_OVER) return
  await update(roomRef, {
    'game/state': GAME_STATES.GAME_OVER,
    'meta/status': 'finished',
  })
}

export async function resignGame(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()
  const { game } = room
  if (game.state !== GAME_STATES.PLAYING) return

  const myColor = game.whiteUid === uid ? 'w' : game.blackUid === uid ? 'b' : null
  if (!myColor) return

  const winnerColor = myColor === 'w' ? 'b' : 'w'
  await update(roomRef, {
    'game/status': 'resignation',
    'game/winner': winnerColor,
    'game/state': GAME_STATES.GAME_OVER,
    'meta/status': 'finished',
  })
}

export async function resetGame(roomCode, playerOrder) {
  const flatBoard = boardToFlat(INITIAL_BOARD)
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'playing',
    game: {
      state: GAME_STATES.PLAYING,
      board: flatBoard,
      currentTurn: COLORS.WHITE,
      whiteUid: playerOrder[1],
      blackUid: playerOrder[0],
      turnStartedAt: Date.now(),
      status: 'normal',
      capturedWhite: null,
      capturedBlack: null,
      lastMove: null,
      moveCount: 0,
      winner: null,
    },
  })
}

export async function returnToLobby(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'lobby',
    game: { state: GAME_STATES.LOBBY },
  })
}

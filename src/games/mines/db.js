import {
  ref,
  set,
  get,
  update,
  onDisconnect,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import { GAME_STATES, DEFAULT_BOARD_ROWS, DEFAULT_BOARD_COLS, DEFAULT_BOMB_COUNT, DEFAULT_TURN_TIME_LIMIT, DEFAULT_NUM_ROUNDS } from './constants/gameConfig'
import { generateBombs, floodReveal, getNextAlivePlayerIndex } from './utils/boardUtils'

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
      gameType: 'mines',
      boardRows: DEFAULT_BOARD_ROWS,
      boardCols: DEFAULT_BOARD_COLS,
      bombCount: DEFAULT_BOMB_COUNT,
      turnTimeLimit: DEFAULT_TURN_TIME_LIMIT,
      numRounds: DEFAULT_NUM_ROUNDS,
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
  if (room.meta.gameType !== 'mines') throw new Error('This is not a Mines room')
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')

  const existingPlayers = room.players || {}
  if (existingPlayers[uid]) {
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), { connected: true })
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  if (Object.keys(existingPlayers).length >= 6) throw new Error('Room is full (max 6)')

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
  const allowed = ['boardRows', 'boardCols', 'bombCount', 'turnTimeLimit', 'numRounds']
  const updates = {}
  for (const key of allowed) {
    if (settings[key] !== undefined) updates[key] = settings[key]
  }
  await update(ref(db, `rooms/${roomCode}/meta`), updates)
}

function makeBombs(meta) {
  const rows = meta?.boardRows ?? DEFAULT_BOARD_ROWS
  const cols = meta?.boardCols ?? DEFAULT_BOARD_COLS
  const bombCount = meta?.bombCount ?? DEFAULT_BOMB_COUNT
  return generateBombs(rows, cols, Math.min(bombCount, rows * cols - 1))
}

export async function startGame(roomCode, playerOrder, meta) {
  const bombs = makeBombs(meta)
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'playing',
    game: {
      state: GAME_STATES.PLAYING,
      bombs,
      revealed: null,
      currentTurnIndex: 0,
      eliminatedPlayers: null,
      turnStartedAt: Date.now(),
      lastAction: null,
      currentRound: 1,
      totalRounds: meta?.numRounds ?? DEFAULT_NUM_ROUNDS,
      roundWins: null,
      roundResults: null,
      roundWinner: null,
      matchWinner: null,
      roundStartPlayerOffset: 0,
    },
  })
}

export async function revealTile(roomCode, uid, tileIndex) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()

  const { game, meta } = room
  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})

  if (game.state !== GAME_STATES.PLAYING) return
  if (playerOrder[game.currentTurnIndex] !== uid) return

  const revealed = game.revealed || {}
  if (revealed[tileIndex] !== undefined) return

  const bombSet = new Set(game.bombs || [])
  const rows = meta.boardRows
  const cols = meta.boardCols
  const eliminated = game.eliminatedPlayers || {}
  const updates = {}

  if (bombSet.has(tileIndex)) {
    updates[`game/revealed/${tileIndex}`] = -1
    updates[`game/eliminatedPlayers/${uid}`] = true
    updates['game/lastAction'] = {
      type: 'explode', index: tileIndex, uid, timestamp: Date.now(),
    }

    const newEliminated = { ...eliminated, [uid]: true }
    const alivePlayers = playerOrder.filter(
      (id) => !newEliminated[id] && room.players[id]?.connected !== false
    )

    if (alivePlayers.length <= 1) {
      const roundWinner = alivePlayers[0] || null
      const currentRound = game.currentRound || 1
      const totalRounds = game.totalRounds || 1
      const prevWins = game.roundWins || {}
      const newWins = { ...prevWins }
      if (roundWinner) newWins[roundWinner] = (newWins[roundWinner] || 0) + 1

      updates['game/roundWinner'] = roundWinner
      updates['game/roundWins'] = newWins
      updates[`game/roundResults/${currentRound}`] = roundWinner

      if (currentRound >= totalRounds) {
        let matchWinner = null
        let maxW = 0
        for (const [pid, w] of Object.entries(newWins)) {
          if (w > maxW) { maxW = w; matchWinner = pid }
        }
        updates['game/matchWinner'] = matchWinner
        updates['game/state'] = GAME_STATES.ROUND_OVER
      } else {
        updates['game/state'] = GAME_STATES.ROUND_OVER
      }
    } else {
      const nextIndex = getNextAlivePlayerIndex(game.currentTurnIndex, playerOrder, newEliminated)
      updates['game/currentTurnIndex'] = nextIndex
      updates['game/turnStartedAt'] = Date.now()
    }
  } else {
    const newRevealed = floodReveal(tileIndex, bombSet, rows, cols, revealed)
    for (const [idx, count] of Object.entries(newRevealed)) {
      updates[`game/revealed/${idx}`] = count
    }
    updates['game/lastAction'] = {
      type: 'reveal', index: tileIndex, uid, timestamp: Date.now(),
    }
    const nextIndex = getNextAlivePlayerIndex(game.currentTurnIndex, playerOrder, eliminated)
    updates['game/currentTurnIndex'] = nextIndex
    updates['game/turnStartedAt'] = Date.now()
  }

  await update(roomRef, updates)
}

export async function startNextRound(roomCode, meta) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()
  if (room.game.state !== GAME_STATES.ROUND_OVER) return

  const nextRound = (room.game.currentRound || 1) + 1
  const bombs = makeBombs(meta)
  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})
  const startIndex = (nextRound - 1) % playerOrder.length

  await update(roomRef, {
    'game/state': GAME_STATES.PLAYING,
    'game/currentRound': nextRound,
    'game/bombs': bombs,
    'game/revealed': null,
    'game/currentTurnIndex': startIndex,
    'game/eliminatedPlayers': null,
    'game/turnStartedAt': Date.now(),
    'game/lastAction': null,
    'game/roundWinner': null,
  })
}

export async function skipTurn(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()

  const { game, meta } = room
  if (game.state !== GAME_STATES.PLAYING) return

  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})
  const uid = playerOrder[game.currentTurnIndex]
  const revealed = game.revealed || {}
  const rows = meta.boardRows
  const cols = meta.boardCols
  const total = rows * cols

  const unrevealed = []
  for (let i = 0; i < total; i++) {
    if (revealed[i] === undefined) unrevealed.push(i)
  }
  if (unrevealed.length === 0) return

  const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)]
  const bombSet = new Set(game.bombs || [])
  const eliminated = game.eliminatedPlayers || {}
  const updates = {}

  if (bombSet.has(randomIndex)) {
    updates[`game/revealed/${randomIndex}`] = -1
    updates[`game/eliminatedPlayers/${uid}`] = true
    updates['game/lastAction'] = {
      type: 'timeout_explode', index: randomIndex, uid, timestamp: Date.now(),
    }

    const newEliminated = { ...eliminated, [uid]: true }
    const alivePlayers = playerOrder.filter(
      (id) => !newEliminated[id] && room.players[id]?.connected !== false
    )

    if (alivePlayers.length <= 1) {
      const roundWinner = alivePlayers[0] || null
      const currentRound = game.currentRound || 1
      const totalRounds = game.totalRounds || 1
      const prevWins = game.roundWins || {}
      const newWins = { ...prevWins }
      if (roundWinner) newWins[roundWinner] = (newWins[roundWinner] || 0) + 1

      updates['game/roundWinner'] = roundWinner
      updates['game/roundWins'] = newWins
      updates[`game/roundResults/${currentRound}`] = roundWinner

      if (currentRound >= totalRounds) {
        let matchWinner = null
        let maxW = 0
        for (const [pid, w] of Object.entries(newWins)) {
          if (w > maxW) { maxW = w; matchWinner = pid }
        }
        updates['game/matchWinner'] = matchWinner
      }
      updates['game/state'] = GAME_STATES.ROUND_OVER
    } else {
      const nextIndex = getNextAlivePlayerIndex(game.currentTurnIndex, playerOrder, newEliminated)
      updates['game/currentTurnIndex'] = nextIndex
      updates['game/turnStartedAt'] = Date.now()
    }
  } else {
    const newRevealed = floodReveal(randomIndex, bombSet, rows, cols, revealed)
    for (const [idx, count] of Object.entries(newRevealed)) {
      updates[`game/revealed/${idx}`] = count
    }
    updates['game/lastAction'] = {
      type: 'timeout_safe', index: randomIndex, uid, timestamp: Date.now(),
    }
    const nextIndex = getNextAlivePlayerIndex(game.currentTurnIndex, playerOrder, eliminated)
    updates['game/currentTurnIndex'] = nextIndex
    updates['game/turnStartedAt'] = Date.now()
  }

  await update(roomRef, updates)
}

export async function resetGame(roomCode, playerOrder, meta) {
  const bombs = makeBombs(meta)
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'playing',
    game: {
      state: GAME_STATES.PLAYING,
      bombs,
      revealed: null,
      currentTurnIndex: 0,
      eliminatedPlayers: null,
      turnStartedAt: Date.now(),
      lastAction: null,
      currentRound: 1,
      totalRounds: meta?.numRounds ?? DEFAULT_NUM_ROUNDS,
      roundWins: null,
      roundResults: null,
      roundWinner: null,
      matchWinner: null,
      roundStartPlayerOffset: 0,
    },
  })
}

export async function finishMatch(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    'game/state': GAME_STATES.FINISHED,
    'meta/status': 'finished',
  })
}

export async function returnToLobby(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'lobby',
    game: { state: GAME_STATES.LOBBY },
  })
}

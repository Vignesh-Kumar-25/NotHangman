import {
  ref,
  set,
  get,
  update,
  onDisconnect,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import {
  COUNTDOWN_MS,
  DEFAULT_GAME_SPEED,
  DEFAULT_PIPE_GAP,
  GAME_STATES,
  MAX_PLAYERS,
} from './constants/gameConfig'

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
      gameType: 'flappy',
      pipeGap: DEFAULT_PIPE_GAP,
      gameSpeed: DEFAULT_GAME_SPEED,
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
  if (room.meta.gameType !== 'flappy') throw new Error('This is not a Flappy room')
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')

  const existingPlayers = room.players || {}
  if (existingPlayers[uid]) {
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), { connected: true })
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  if (Object.keys(existingPlayers).length >= MAX_PLAYERS) throw new Error(`Room is full (max ${MAX_PLAYERS})`)

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
    const updates = {
      [`players/${uid}/connected`]: false,
      [`game/runs/${uid}/alive`]: false,
      [`game/runs/${uid}/leftAt`]: Date.now(),
    }
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
  const allowed = ['pipeGap', 'gameSpeed']
  const updates = {}
  for (const key of allowed) {
    if (settings[key] !== undefined) updates[key] = settings[key]
  }
  await update(ref(db, `rooms/${roomCode}/meta`), updates)
}

function makeRuns(playerOrder) {
  return Object.fromEntries(playerOrder.map((id) => [id, {
    alive: true,
    score: 0,
    survivalMs: 0,
    y: 260,
    velocity: 0,
    crashedAt: null,
  }]))
}

export async function startGame(roomCode, playerOrder, meta, serverTimeOffset = 0) {
  const now = Date.now() + serverTimeOffset
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'playing',
    game: {
      state: GAME_STATES.PLAYING,
      seed: Math.floor(Math.random() * 1000000000),
      startsAt: now + COUNTDOWN_MS,
      pipeGap: meta?.pipeGap ?? DEFAULT_PIPE_GAP,
      gameSpeed: meta?.gameSpeed ?? DEFAULT_GAME_SPEED,
      runs: makeRuns(playerOrder),
      winner: null,
      finishedAt: null,
    },
  })
}

export async function reportRunState(roomCode, uid, state) {
  const updates = {}
  for (const key of ['alive', 'score', 'survivalMs', 'y', 'velocity']) {
    if (state[key] !== undefined) updates[`game/runs/${uid}/${key}`] = state[key]
  }
  if (state.crashedAt !== undefined) updates[`game/runs/${uid}/crashedAt`] = state.crashedAt
  if (Object.keys(updates).length > 0) {
    await update(ref(db, `rooms/${roomCode}`), updates)
  }
}

export async function finishRace(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()
  if (room.game?.state !== GAME_STATES.PLAYING) return

  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})
  const players = room.players || {}
  const runs = room.game.runs || {}
  const connected = playerOrder.filter((id) => players[id]?.connected !== false)
  const alive = connected.filter((id) => runs[id]?.alive !== false)
  if (alive.length > 0) return

  let winner = null
  for (const id of connected) {
    const current = runs[id] || {}
    const best = winner ? runs[winner] || {} : null
    if (!winner || (current.score || 0) > (best.score || 0)) {
      winner = id
    } else if ((current.score || 0) === (best.score || 0) && (current.survivalMs || 0) > (best.survivalMs || 0)) {
      winner = id
    }
  }

  await update(roomRef, {
    'game/state': GAME_STATES.FINISHED,
    'game/winner': winner,
    'game/finishedAt': Date.now(),
    'meta/status': 'finished',
  })
}

export async function resetGame(roomCode, playerOrder, meta, serverTimeOffset = 0) {
  await startGame(roomCode, playerOrder, meta, serverTimeOffset)
}

export async function returnToLobby(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'lobby',
    game: { state: GAME_STATES.LOBBY },
  })
}

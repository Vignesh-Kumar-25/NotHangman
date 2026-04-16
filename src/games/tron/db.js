import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import { GAME_STATES } from './constants/gameStates'
import {
  DEFAULT_NUM_ROUNDS,
  DEFAULT_ROUND_DURATION,
  DEFAULT_TRAIL_LENGTH,
  POINTS_ROUND_WIN,
  POINTS_KILL,
} from './constants/gameConfig'
import { DEFAULT_VEHICLE_COLOR, DEFAULT_VEHICLE_STYLE } from './constants/vehicles'
import { assignSpawns } from './utils/spawnUtils'

// ── Room CRUD ───────────────────────────────────────────

export async function createRoom(uid, username, avatarId, vehicleColor, vehicleStyle) {
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
      gameType: 'tron',
      numRounds: DEFAULT_NUM_ROUNDS,
      roundDuration: DEFAULT_ROUND_DURATION,
      trailLength: DEFAULT_TRAIL_LENGTH,
      powerUpsEnabled: true,
    },
    players: {
      [uid]: {
        uid, username, avatarId,
        vehicleColor: vehicleColor ?? DEFAULT_VEHICLE_COLOR,
        vehicleStyle: vehicleStyle ?? DEFAULT_VEHICLE_STYLE,
        score: 0, joinedAt: now, connected: true,
      },
    },
    playerOrder: [uid],
    game: { state: GAME_STATES.LOBBY },
  })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
  return roomCode
}

export async function joinRoom(roomCode, uid, username, avatarId, vehicleColor, vehicleStyle) {
  if (!uid) throw new Error('Not signed in')
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) throw new Error('Room not found')
  const room = snap.val()
  if (room.meta.gameType !== 'tron') throw new Error('This is not a Tron room')
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')
  if (Object.keys(room.players || {}).length >= 4) throw new Error('Room is full (max 4)')

  // Check color uniqueness
  const usedColors = Object.values(room.players || {}).map((p) => p.vehicleColor)
  let finalColor = vehicleColor ?? DEFAULT_VEHICLE_COLOR
  if (usedColors.includes(finalColor)) {
    // Pick first unused color
    for (let i = 0; i < 8; i++) {
      if (!usedColors.includes(i)) { finalColor = i; break }
    }
  }

  const now = Date.now()
  const updates = {}
  updates[`players/${uid}`] = {
    uid, username, avatarId,
    vehicleColor: finalColor,
    vehicleStyle: vehicleStyle ?? DEFAULT_VEHICLE_STYLE,
    score: 0, joinedAt: now, connected: true,
  }
  updates['playerOrder'] = [...(room.playerOrder || []), uid]
  await update(roomRef, updates)
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
}

export async function leaveRoom(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return
  const room = snap.val()
  const updates = { [`players/${uid}/connected`]: false }
  const playerOrder = room.playerOrder || []
  const connectedOthers = playerOrder.filter((id) => id !== uid && room.players?.[id]?.connected !== false)

  if (room.meta.status === 'lobby') {
    const newOrder = playerOrder.filter((id) => id !== uid)
    if (room.meta.hostUid === uid && newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
      updates['playerOrder'] = newOrder
    }
  } else if (room.meta.hostUid === uid && connectedOthers.length > 0) {
    updates['meta/hostUid'] = connectedOthers[0]
  }
  await update(roomRef, updates)
}

export async function updateVehicle(roomCode, uid, vehicleColor, vehicleStyle) {
  await update(ref(db, `rooms/${roomCode}/players/${uid}`), { vehicleColor, vehicleStyle })
}

export async function updateSettings(roomCode, settings) {
  const allowed = ['numRounds', 'roundDuration', 'trailLength', 'powerUpsEnabled']
  const updates = {}
  for (const key of allowed) {
    if (settings[key] !== undefined) updates[key] = settings[key]
  }
  await update(ref(db, `rooms/${roomCode}/meta`), updates)
}

// ── Game lifecycle ──────────────────────────────────────

export async function startGame(roomCode, playerOrder, meta) {
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const spawns = assignSpawns(playerOrder)
  const seed = Math.floor(Math.random() * 2147483647)

  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.COUNTDOWN,
      round: 1,
      totalRounds: numRounds,
      roundStartTime: null,
      seed,
      spawns,
      snapshot: null,
      inputs: null,
      deaths: null,
      roundResults: null,
    },
  })
}

export async function beginPlaying(roomCode) {
  await update(ref(db, `rooms/${roomCode}/game`), {
    state: GAME_STATES.PLAYING,
    roundStartTime: serverTimestamp(),
  })
}

// ── Host-authoritative sync ─────────────────────────────

// Host writes game state snapshot (called ~10x per second)
export async function writeSnapshot(roomCode, snapshot) {
  await set(ref(db, `rooms/${roomCode}/game/snapshot`), snapshot)
}

// Clients subscribe to snapshot
export function subscribeToSnapshot(roomCode, callback) {
  const snapshotRef = ref(db, `rooms/${roomCode}/game/snapshot`)
  onValue(snapshotRef, (snap) => {
    const data = snap.val()
    if (data) callback(data)
  })
  return () => off(snapshotRef)
}

// Client writes their turn input (overwrite, not push)
export async function writeTurnInput(roomCode, uid, turnInput) {
  await set(ref(db, `rooms/${roomCode}/game/inputs/${uid}`), {
    turnInput,
    t: Date.now(),
  })
}

// Host subscribes to all player inputs
export function subscribeToInputs(roomCode, callback) {
  const inputsRef = ref(db, `rooms/${roomCode}/game/inputs`)
  onValue(inputsRef, (snap) => {
    const data = snap.val()
    if (data) callback(data)
  })
  return () => off(inputsRef)
}

// ── Round end / scoring ─────────────────────────────────

export async function endRound(roomCode, game, players, winnerUid, killMap) {
  const round = game.round
  const scoreUpdates = {}
  const scores = {}

  for (const [uid, player] of Object.entries(players)) {
    let earned = 0
    if (uid === winnerUid) earned += POINTS_ROUND_WIN
    if (killMap) {
      const kills = Object.values(killMap).filter((d) => d.killedBy === uid).length
      earned += kills * POINTS_KILL
    }
    const newScore = (player.score ?? 0) + earned
    scores[uid] = newScore
    scoreUpdates[`players/${uid}/score`] = newScore
  }

  await update(ref(db, `rooms/${roomCode}`), {
    ...scoreUpdates,
    [`game/roundResults/${round}`]: { winnerUid: winnerUid || null, kills: killMap || {}, scores },
    'game/state': GAME_STATES.ROUND_END,
  })
}

export async function advanceRound(roomCode, game, playerOrder) {
  const nextRound = game.round + 1
  if (nextRound > game.totalRounds) {
    await update(ref(db, `rooms/${roomCode}`), {
      'game/state': GAME_STATES.GAME_OVER,
      'meta/status': 'finished',
    })
    return
  }
  const spawns = assignSpawns(playerOrder)
  const seed = Math.floor(Math.random() * 2147483647)
  await update(ref(db, `rooms/${roomCode}/game`), {
    state: GAME_STATES.COUNTDOWN,
    round: nextRound,
    roundStartTime: null,
    seed, spawns,
    snapshot: null,
    inputs: null,
    deaths: null,
  })
}

export async function resetGame(roomCode, playerOrder, players, meta) {
  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
  }
  const spawns = assignSpawns(playerOrder)
  const seed = Math.floor(Math.random() * 2147483647)
  await update(ref(db, `rooms/${roomCode}`), {
    ...playerUpdates,
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.COUNTDOWN,
      round: 1,
      totalRounds: meta?.numRounds ?? DEFAULT_NUM_ROUNDS,
      roundStartTime: null,
      seed, spawns,
      snapshot: null, inputs: null, deaths: null, roundResults: null,
    },
  })
}

export async function promoteHost(roomCode, newHostUid) {
  await update(ref(db, `rooms/${roomCode}/meta`), { hostUid: newHostUid })
}

// ── Color uniqueness check ──────────────────────────────

export function getUsedColors(players) {
  return Object.values(players || {})
    .filter((p) => p.connected !== false)
    .map((p) => p.vehicleColor)
}

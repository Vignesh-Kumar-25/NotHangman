import {
  ref,
  set,
  get,
  update,
  push,
  onChildAdded,
  onValue,
  off,
  query,
  orderByKey,
  limitToLast,
  onDisconnect,
  serverTimestamp,
  runTransaction,
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

// ── Room helpers ────────────────────────────────────────

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
  const roomData = {
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
        uid,
        username,
        avatarId,
        vehicleColor: vehicleColor ?? DEFAULT_VEHICLE_COLOR,
        vehicleStyle: vehicleStyle ?? DEFAULT_VEHICLE_STYLE,
        score: 0,
        joinedAt: now,
        connected: true,
      },
    },
    playerOrder: [uid],
    game: {
      state: GAME_STATES.LOBBY,
    },
  }

  await set(ref(db, `rooms/${roomCode}`), roomData)
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

  const now = Date.now()
  const updates = {}
  updates[`players/${uid}`] = {
    uid,
    username,
    avatarId,
    vehicleColor: vehicleColor ?? DEFAULT_VEHICLE_COLOR,
    vehicleStyle: vehicleStyle ?? DEFAULT_VEHICLE_STYLE,
    score: 0,
    joinedAt: now,
    connected: true,
  }
  const currentOrder = room.playerOrder || []
  updates['playerOrder'] = [...currentOrder, uid]

  await update(roomRef, updates)
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
}

export async function leaveRoom(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return

  const room = snap.val()
  const updates = {}
  updates[`players/${uid}/connected`] = false

  const playerOrder = room.playerOrder || []
  const connectedOthers = playerOrder.filter(
    (id) => id !== uid && room.players?.[id]?.connected !== false
  )

  if (room.meta.status === 'lobby') {
    const newOrder = playerOrder.filter((id) => id !== uid)
    if (room.meta.hostUid === uid && newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
      updates['playerOrder'] = newOrder
    }
  } else if (room.meta.status === 'in_progress') {
    if (room.meta.hostUid === uid && connectedOthers.length > 0) {
      updates['meta/hostUid'] = connectedOthers[0]
    }
  }

  await update(roomRef, updates)
}

export async function updateVehicle(roomCode, uid, vehicleColor, vehicleStyle) {
  await update(ref(db, `rooms/${roomCode}/players/${uid}`), {
    vehicleColor,
    vehicleStyle,
  })
}

// ── Lobby settings ──────────────────────────────────────

export async function updateSettings(roomCode, settings) {
  const allowed = ['numRounds', 'roundDuration', 'trailLength', 'powerUpsEnabled']
  const updates = {}
  for (const key of allowed) {
    if (settings[key] !== undefined) updates[key] = settings[key]
  }
  await update(ref(db, `rooms/${roomCode}/meta`), updates)
}

// ── Game start ──────────────────────────────────────────

export async function startGame(roomCode, playerOrder, meta) {
  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const spawns = assignSpawns(playerOrder)
  const seed = Math.floor(Math.random() * 2147483647)

  const updates = {
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.COUNTDOWN,
      round: 1,
      totalRounds: numRounds,
      roundStartTime: null,
      seed,
      spawns,
      inputs: null,
      deaths: null,
      powerUps: null,
      roundResults: null,
    },
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Countdown → Playing ─────────────────────────────────

export async function beginPlaying(roomCode) {
  await update(ref(db, `rooms/${roomCode}/game`), {
    state: GAME_STATES.PLAYING,
    roundStartTime: serverTimestamp(),
  })
}

// ── Input broadcasting ──────────────────────────────────

export async function broadcastInput(roomCode, uid, direction, x, y, tick) {
  const inputRef = ref(db, `rooms/${roomCode}/game/inputs`)
  await push(inputRef, {
    uid,
    direction,
    x,
    y,
    tick,
    timestamp: serverTimestamp(),
  })
}

// ── Subscribe to inputs ─────────────────────────────────

export function subscribeToInputs(roomCode, callback) {
  const inputsRef = query(
    ref(db, `rooms/${roomCode}/game/inputs`),
    orderByKey(),
    limitToLast(1)
  )
  const unsubscribe = onChildAdded(inputsRef, (snap) => {
    callback(snap.val())
  })
  return () => off(inputsRef, 'child_added', unsubscribe)
}

// ── Death events ────────────────────────────────────────

export async function reportDeath(roomCode, uid, killedBy, tick, x, y) {
  await set(ref(db, `rooms/${roomCode}/game/deaths/${uid}`), {
    killedBy,
    tick,
    x,
    y,
    timestamp: serverTimestamp(),
  })
}

export function subscribeToDeaths(roomCode, callback) {
  const deathsRef = ref(db, `rooms/${roomCode}/game/deaths`)
  const unsub = onChildAdded(deathsRef, (snap) => {
    callback(snap.key, snap.val())
  })
  return () => off(deathsRef, 'child_added', unsub)
}

// ── Round end ───────────────────────────────────────────

export async function endRound(roomCode, game, players, winnerUid, killMap) {
  const round = game.round
  const scores = {}
  const scoreUpdates = {}

  for (const [uid, player] of Object.entries(players)) {
    let earned = 0
    if (uid === winnerUid) earned += POINTS_ROUND_WIN
    // Count kills (how many deaths have killedBy === this uid)
    if (killMap) {
      const kills = Object.values(killMap).filter((d) => d.killedBy === uid).length
      earned += kills * POINTS_KILL
    }
    const newScore = (player.score ?? 0) + earned
    scores[uid] = newScore
    scoreUpdates[`players/${uid}/score`] = newScore
  }

  const updates = {
    ...scoreUpdates,
    [`game/roundResults/${round}`]: {
      winnerUid: winnerUid || null,
      kills: killMap || {},
      scores,
    },
    'game/state': GAME_STATES.ROUND_END,
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Advance to next round ───────────────────────────────

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
    seed,
    spawns,
    inputs: null,
    deaths: null,
    powerUps: null,
  })
}

// ── Reset game (play again) ─────────────────────────────

export async function resetGame(roomCode, playerOrder, players, meta) {
  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
  }

  const numRounds = meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const spawns = assignSpawns(playerOrder)
  const seed = Math.floor(Math.random() * 2147483647)

  await update(ref(db, `rooms/${roomCode}`), {
    ...playerUpdates,
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.COUNTDOWN,
      round: 1,
      totalRounds: numRounds,
      roundStartTime: null,
      seed,
      spawns,
      inputs: null,
      deaths: null,
      powerUps: null,
      roundResults: null,
    },
  })
}

// ── Promote host ────────────────────────────────────────

export async function promoteHost(roomCode, newHostUid) {
  await update(ref(db, `rooms/${roomCode}/meta`), { hostUid: newHostUid })
}

// ── Power-up claim ──────────────────────────────────────

export async function claimPowerUp(roomCode, powerUpId, uid) {
  const puRef = ref(db, `rooms/${roomCode}/game/powerUps/${powerUpId}/claimedBy`)
  await runTransaction(puRef, (current) => {
    if (current !== null) return  // already claimed
    return uid
  })
}

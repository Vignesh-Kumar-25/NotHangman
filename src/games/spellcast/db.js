import {
  ref,
  set,
  get,
  update,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import { generateBoard, replaceTiles, shuffleBoard, swapTileLetter } from './utils/boardUtils'
import { getNextPlayerUid } from './utils/turnUtils'
import { earnGems, spendGems } from './utils/gemUtils'
import { STARTING_GEMS, NUM_ROUNDS, TURN_DURATION, MAX_PLAYERS } from './constants/gameConfig'
import { GAME_STATES } from './constants/gameStates'

// ── Room helpers ────────────────────────────────────────

export async function createRoom(uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in. Enable Anonymous Authentication in your Firebase console.')
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
    },
    players: {
      [uid]: {
        uid,
        username,
        avatarId,
        score: 0,
        gems: STARTING_GEMS,
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

export async function joinRoom(roomCode, uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in. Enable Anonymous Authentication in your Firebase console.')
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)

  if (!snap.exists()) throw new Error('Room not found')
  const room = snap.val()
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')

  const existingPlayer = room.players?.[uid]
  const currentOrder = room.playerOrder || []

  if (existingPlayer) {
    const updates = {
      [`players/${uid}/connected`]: true,
      [`players/${uid}/username`]: username,
      [`players/${uid}/avatarId`]: avatarId,
    }
    if (!currentOrder.includes(uid)) {
      updates['playerOrder'] = [...currentOrder, uid]
    }
    await update(roomRef, updates)
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  const connectedCount = currentOrder.filter(
    (id) => room.players?.[id]?.connected !== false
  ).length
  if (connectedCount >= MAX_PLAYERS) throw new Error('Room is full')

  const now = Date.now()
  const updates = {}
  updates[`players/${uid}`] = {
    uid,
    username,
    avatarId,
    score: 0,
    gems: STARTING_GEMS,
    joinedAt: now,
    connected: true,
  }
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
    updates['playerOrder'] = newOrder
    updates[`players/${uid}`] = null
    if (room.meta.hostUid === uid && newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
    }
  } else if (room.meta.status === 'in_progress') {
    const game = room.game
    if (game?.state === GAME_STATES.PLAYING && game?.currentTurnUid === uid) {
      if (connectedOthers.length > 0) {
        updates['game/currentTurnUid'] = getNextPlayerUid(uid, playerOrder, room.players)
        updates['game/turnStartTime'] = serverTimestamp()
        updates['game/turnIndex'] = (game.turnIndex || 0) + 1
      }
    }
    if (room.meta.hostUid === uid && connectedOthers.length > 0) {
      updates['meta/hostUid'] = connectedOthers[0]
    }
  }

  await update(roomRef, updates)
}

// ── Reconnect (player refreshed during game) ───────────

export async function reconnectPlayer(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return

  const room = snap.val()
  const player = room.players?.[uid]
  if (!player) return
  if (player.connected) return

  await update(roomRef, {
    [`players/${uid}/connected`]: true,
  })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
}

// ── Settings ────────────────────────────────────────────

export async function setRoomNumRounds(roomCode, numRounds) {
  await update(ref(db, `rooms/${roomCode}/meta`), { numRounds })
}

export async function setRoomTurnDuration(roomCode, turnDuration) {
  await update(ref(db, `rooms/${roomCode}/meta`), { turnDuration })
}

// ── Vote to kick ───────────────────────────────────────

export async function voteToKick(roomCode, voterUid, targetUid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)
  if (!snap.exists()) return

  const room = snap.val()
  const playerOrder = room.playerOrder || []
  const players = room.players || {}
  const connectedIds = playerOrder.filter(
    (id) => players[id]?.connected !== false && id !== targetUid
  )

  const kickVotes = room.kickVotes?.[targetUid] || {}
  kickVotes[voterUid] = true
  const voteCount = Object.keys(kickVotes).length
  const needed = Math.ceil(connectedIds.length / 2)

  const updates = {}
  updates[`kickVotes/${targetUid}`] = kickVotes

  if (voteCount >= needed) {
    updates[`players/${targetUid}/connected`] = false
    updates[`players/${targetUid}/kicked`] = true
    updates[`kickVotes/${targetUid}`] = null

    if (room.meta.status === 'lobby') {
      updates['playerOrder'] = playerOrder.filter((id) => id !== targetUid)
      updates[`players/${targetUid}`] = null
    }

    if (room.meta.hostUid === targetUid) {
      const remaining = connectedIds.filter((id) => id !== targetUid)
      if (remaining.length > 0) updates['meta/hostUid'] = remaining[0]
    }

    if (room.game?.currentTurnUid === targetUid && room.meta.status === 'in_progress') {
      const remaining = connectedIds.filter((id) => id !== targetUid)
      if (remaining.length > 0) {
        updates['game/currentTurnUid'] = remaining[0]
        updates['game/turnStartTime'] = serverTimestamp()
      }
    }
  }

  await update(roomRef, updates)
  return { voteCount, needed, kicked: voteCount >= needed }
}

export async function promoteHost(roomCode, newHostUid) {
  await update(ref(db, `rooms/${roomCode}/meta`), { hostUid: newHostUid })
}

// ── Game start ──────────────────────────────────────────

export async function startGame(roomCode, playerOrder, numRounds = NUM_ROUNDS) {
  const metaSnap = await get(ref(db, `rooms/${roomCode}/meta`))
  const meta = metaSnap.val() || {}
  const turnDuration = meta.turnDuration ?? TURN_DURATION

  const board = generateBoard(1)

  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
    playerUpdates[`players/${uid}/gems`] = STARTING_GEMS
  }

  const updates = {
    ...playerUpdates,
    'meta/status': 'in_progress',
    'meta/numRounds': numRounds,
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      numRounds,
      turnDuration,
      currentTurnUid: playerOrder[0],
      turnStartTime: serverTimestamp(),
      turnIndex: 0,
      board,
      lastWord: null,
      usedAbility: null,
      hintWord: null,
    },
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Turn to playing ─────────────────────────────────────

export async function beginPlaying(roomCode) {
  await update(ref(db, `rooms/${roomCode}/game`), {
    state: GAME_STATES.PLAYING,
    turnStartTime: serverTimestamp(),
  })
}

// ── Submit a word ───────────────────────────────────────

export async function submitWord(roomCode, uid, path, word, score, gemsEarned, game, playerOrder, players) {
  if (game.currentTurnUid !== uid) return

  const currentScore = players[uid]?.score ?? 0
  const currentGems = players[uid]?.gems ?? 0
  const newBoard = replaceTiles(game.board, path)
  const nextTurnIndex = (game.turnIndex || 0) + 1

  const updates = {}
  updates[`players/${uid}/score`] = currentScore + score
  updates[`players/${uid}/gems`] = earnGems(currentGems, gemsEarned)
  updates['game/lastWord'] = { path, word, score, playerUid: uid }
  updates['game/board'] = newBoard
  updates['game/turnIndex'] = nextTurnIndex
  updates['game/usedAbility'] = null
  updates['game/hintWord'] = null

  if (nextTurnIndex >= playerOrder.length) {
    updates['game/state'] = GAME_STATES.ROUND_END
    updates['game/currentTurnUid'] = null
  } else {
    updates['game/currentTurnUid'] = getNextPlayerUid(uid, playerOrder, players)
    updates['game/turnStartTime'] = serverTimestamp()
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Pass turn (timer expired) ───────────────────────────

export async function passTurn(roomCode, game, playerOrder, players) {
  const nextTurnIndex = (game.turnIndex || 0) + 1
  const updates = {}
  updates['game/turnIndex'] = nextTurnIndex
  updates['game/usedAbility'] = null
  updates['game/hintWord'] = null
  updates['game/lastWord'] = null

  if (nextTurnIndex >= playerOrder.length) {
    updates['game/state'] = GAME_STATES.ROUND_END
    updates['game/currentTurnUid'] = null
  } else {
    updates['game/currentTurnUid'] = getNextPlayerUid(game.currentTurnUid, playerOrder, players)
    updates['game/turnStartTime'] = serverTimestamp()
  }

  await update(ref(db, `rooms/${roomCode}/game`), updates)
}

// ── Abilities ───────────────────────────────────────────

export async function useAbilityShuffle(roomCode, uid, game, players) {
  if (game.currentTurnUid !== uid) return
  const currentGems = players[uid]?.gems ?? 0
  const newBoard = shuffleBoard(game.board)

  await update(ref(db, `rooms/${roomCode}`), {
    [`players/${uid}/gems`]: spendGems(currentGems, 1),
    'game/board': newBoard,
    'game/usedAbility': 'shuffle',
  })
}

export async function useAbilitySwap(roomCode, uid, row, col, newLetter, game, players) {
  if (game.currentTurnUid !== uid) return
  const currentGems = players[uid]?.gems ?? 0
  const newBoard = swapTileLetter(game.board, row, col, newLetter)

  await update(ref(db, `rooms/${roomCode}`), {
    [`players/${uid}/gems`]: spendGems(currentGems, 3),
    'game/board': newBoard,
    'game/usedAbility': 'swap',
  })
}

export async function useAbilityHint(roomCode, uid, hintPath, game, players) {
  if (game.currentTurnUid !== uid) return
  const currentGems = players[uid]?.gems ?? 0

  await update(ref(db, `rooms/${roomCode}`), {
    [`players/${uid}/gems`]: spendGems(currentGems, 4),
    'game/hintWord': hintPath,
    'game/usedAbility': 'hint',
  })
}

// ── Advance to next round ───────────────────────────────

export async function advanceRound(roomCode, game, playerOrder, players) {
  const nextRound = game.round + 1

  const scores = {}
  for (const [uid, player] of Object.entries(players)) {
    scores[uid] = player.score
  }

  if (nextRound > game.numRounds) {
    // Convert leftover gems to points
    const gemUpdates = {}
    for (const uid of playerOrder) {
      const gems = players[uid]?.gems ?? 0
      if (gems > 0) {
        gemUpdates[`players/${uid}/score`] = (players[uid]?.score ?? 0) + gems
        gemUpdates[`players/${uid}/gems`] = 0
      }
    }

    const updates = {
      ...gemUpdates,
      [`roundHistory/${game.round}`]: { scores },
      'game/state': GAME_STATES.GAME_OVER,
      'meta/status': 'finished',
    }
    await update(ref(db, `rooms/${roomCode}`), updates)
    return
  }

  const newBoard = generateBoard(nextRound)

  const updates = {
    [`roundHistory/${game.round}`]: { scores },
    game: {
      state: GAME_STATES.ROUND_START,
      round: nextRound,
      numRounds: game.numRounds,
      turnDuration: game.turnDuration ?? TURN_DURATION,
      currentTurnUid: playerOrder[0],
      turnStartTime: serverTimestamp(),
      turnIndex: 0,
      board: newBoard,
      lastWord: null,
      usedAbility: null,
      hintWord: null,
    },
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Play Again (reset) ──────────────────────────────────

export async function resetGame(roomCode, playerOrder, players) {
  const metaSnap = await get(ref(db, `rooms/${roomCode}/meta`))
  const meta = metaSnap.val() || {}
  const numRounds = meta.numRounds ?? NUM_ROUNDS

  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
    playerUpdates[`players/${uid}/gems`] = STARTING_GEMS
  }

  const board = generateBoard(1)

  await update(ref(db, `rooms/${roomCode}`), {
    ...playerUpdates,
    roundHistory: null,
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      numRounds,
      turnDuration: meta.turnDuration ?? TURN_DURATION,
      currentTurnUid: playerOrder[0],
      turnStartTime: serverTimestamp(),
      turnIndex: 0,
      board,
      lastWord: null,
      usedAbility: null,
      hintWord: null,
    },
  })
}

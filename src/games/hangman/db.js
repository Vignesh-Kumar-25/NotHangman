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
import { pickWord, pickWordForRound, isWordSolved, normalizeGuess } from './utils/wordUtils'
import { getNextPlayerUid } from './utils/turnUtils'
import {
  POINTS_CORRECT_LETTER,
  POINTS_CORRECT_WORD,
  POINTS_SOLVE_BONUS,
  DEFAULT_NUM_ROUNDS,
} from './constants/gameConfig'
import { GAME_STATES } from './constants/gameStates'

// ── Room helpers ────────────────────────────────────────

export async function createRoom(uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in. Enable Anonymous Authentication in your Firebase console → Authentication → Sign-in method → Anonymous.')
  let roomCode
  let attempts = 0
  // Ensure unique code
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
  // Mark player disconnected when they leave
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)

  return roomCode
}

export async function joinRoom(roomCode, uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in. Enable Anonymous Authentication in your Firebase console → Authentication → Sign-in method → Anonymous.')
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snap = await get(roomRef)

  if (!snap.exists()) throw new Error('Room not found')
  const room = snap.val()
  if (room.meta.status !== 'lobby') throw new Error('Game already in progress')

  const existingPlayer = room.players?.[uid]
  const currentOrder = room.playerOrder || []

  // Player rejoining — just re-enable them
  if (existingPlayer) {
    const updates = {
      [`players/${uid}/connected`]: true,
      [`players/${uid}/username`]: username,
      [`players/${uid}/avatarId`]: avatarId,
    }
    // Ensure they're in playerOrder (may have been removed on leave)
    if (!currentOrder.includes(uid)) {
      updates['playerOrder'] = [...currentOrder, uid]
    }
    await update(roomRef, updates)
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  // New player joining
  const connectedCount = currentOrder.filter(
    (id) => room.players?.[id]?.connected !== false
  ).length
  if (connectedCount >= 5) throw new Error('Room is full')

  const now = Date.now()
  const updates = {}
  updates[`players/${uid}`] = {
    uid,
    username,
    avatarId,
    score: 0,
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
    // Remove from order and delete player entry
    const newOrder = playerOrder.filter((id) => id !== uid)
    updates['playerOrder'] = newOrder
    updates[`players/${uid}`] = null
    if (room.meta.hostUid === uid && newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
    }
  } else if (room.meta.status === 'in_progress') {
    const game = room.game
    // If it's this player's turn, pass to next connected player
    if (game?.state === GAME_STATES.PLAYING && game?.currentTurnUid === uid) {
      if (connectedOthers.length > 0) {
        const currentIdx = playerOrder.indexOf(uid)
        let nextUid = connectedOthers[0]
        for (const id of connectedOthers) {
          if (playerOrder.indexOf(id) > currentIdx) {
            nextUid = id
            break
          }
        }
        updates['game/currentTurnUid'] = nextUid
        updates['game/turnStartTime'] = serverTimestamp()
      }
    }
    // Transfer host if needed
    if (room.meta.hostUid === uid && connectedOthers.length > 0) {
      updates['meta/hostUid'] = connectedOthers[0]
    }
  }

  await update(roomRef, updates)
}

export async function setRoomNumRounds(roomCode, numRounds) {
  await update(ref(db, `rooms/${roomCode}/meta`), { numRounds })
}

export async function setRoomTurnDuration(roomCode, turnDuration) {
  await update(ref(db, `rooms/${roomCode}/meta`), { turnDuration })
}

export async function setRoomCategories(roomCode, categories) {
  // categories is an array like ['movies', 'countries'] or null for all
  await update(ref(db, `rooms/${roomCode}/meta`), { categories: categories || null })
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

  // Record this vote
  const kickVotes = room.kickVotes?.[targetUid] || {}
  kickVotes[voterUid] = true
  const voteCount = Object.keys(kickVotes).length
  const needed = Math.ceil(connectedIds.length / 2)

  const updates = {}
  updates[`kickVotes/${targetUid}`] = kickVotes

  if (voteCount >= needed) {
    // Kick passes — disconnect the player
    updates[`players/${targetUid}/connected`] = false
    updates[`players/${targetUid}/kicked`] = true
    updates[`kickVotes/${targetUid}`] = null

    // Remove from playerOrder in lobby
    if (room.meta.status === 'lobby') {
      updates['playerOrder'] = playerOrder.filter((id) => id !== targetUid)
      updates[`players/${targetUid}`] = null
    }

    // Transfer host if kicked player was host
    if (room.meta.hostUid === targetUid) {
      const remaining = connectedIds.filter((id) => id !== targetUid)
      if (remaining.length > 0) updates['meta/hostUid'] = remaining[0]
    }

    // Transfer turn if kicked player had turn
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

// ── Game start ──────────────────────────────────────────

export async function startGame(roomCode, playerOrder, numRounds = DEFAULT_NUM_ROUNDS, { turnDuration, categories } = {}) {
  // Read current meta for settings
  const metaSnap = await get(ref(db, `rooms/${roomCode}/meta`))
  const meta = metaSnap.val() || {}
  const effectiveTurnDuration = turnDuration ?? meta.turnDuration ?? 30
  const effectiveCategories = categories ?? meta.categories ?? null

  const { word, category } = pickWordForRound(0, effectiveCategories)
  const totalRounds = numRounds * playerOrder.length

  const updates = {
    'meta/status': 'in_progress',
    'meta/numRounds': numRounds,
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      totalRounds,
      numRounds,
      turnDuration: effectiveTurnDuration,
      categories: effectiveCategories,
      currentTurnUid: playerOrder[0],
      turnStartTime: serverTimestamp(),
      word,
      category,
      guessedLetters: {},
      wrongGuessCount: 0,
      wordSolved: false,
      solverUid: null,
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

// ── Guess a letter ──────────────────────────────────────

export async function guessLetter(roomCode, uid, letterRaw, game, playerOrder, players) {
  const letter = normalizeGuess(letterRaw)
  if (!letter || letter.length !== 1) return
  if (game.guessedLetters && game.guessedLetters[letter] !== undefined) return // already guessed
  if (game.currentTurnUid !== uid) return

  const inWord = game.word.includes(letter)
  const currentScore = players[uid]?.score ?? 0
  const updatedGuessed = { ...(game.guessedLetters || {}), [letter]: inWord }

  const updates = {}
  updates[`game/guessedLetters/${letter}`] = inWord

  if (inWord) {
    if (isWordSolved(game.word, updatedGuessed)) {
      // Solving bonus
      updates[`players/${uid}/score`] = currentScore + POINTS_CORRECT_LETTER + POINTS_SOLVE_BONUS
      updates['game/wordSolved'] = true
      updates['game/solverUid'] = uid
      updates['game/state'] = GAME_STATES.ROUND_END
      // Reveal all letters for the end display (skip spaces — invalid Firebase keys)
      for (const char of game.word) {
        if (char !== ' ') updates[`game/guessedLetters/${char}`] = true
      }
    } else {
      updates[`players/${uid}/score`] = currentScore + POINTS_CORRECT_LETTER
      updates['game/turnStartTime'] = serverTimestamp()
    }
  } else {
    updates['game/wrongGuessCount'] = (game.wrongGuessCount || 0) + 1
    updates['game/currentTurnUid'] = getNextPlayerUid(uid, playerOrder)
    updates['game/turnStartTime'] = serverTimestamp()
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Guess the full word ─────────────────────────────────

export async function guessWord(roomCode, uid, wordGuessRaw, game, playerOrder, players) {
  const wordGuess = normalizeGuess(wordGuessRaw)
  if (!wordGuess) return
  if (game.currentTurnUid !== uid) return

  const currentScore = players[uid]?.score ?? 0
  const correct = wordGuess === game.word

  const updates = {}
  if (correct) {
    updates[`players/${uid}/score`] = currentScore + POINTS_CORRECT_WORD + POINTS_SOLVE_BONUS
    updates['game/wordSolved'] = true
    updates['game/solverUid'] = uid
    updates['game/state'] = GAME_STATES.ROUND_END
    // Reveal all letters (skip spaces — invalid Firebase keys)
    for (const char of game.word) {
      if (char !== ' ') updates[`game/guessedLetters/${char}`] = true
    }
  } else {
    updates['game/wrongGuessCount'] = (game.wrongGuessCount || 0) + 1
    updates['game/currentTurnUid'] = getNextPlayerUid(uid, playerOrder)
    updates['game/turnStartTime'] = serverTimestamp()
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Pass turn (timer expired) ───────────────────────────

export async function passTurn(roomCode, game, playerOrder) {
  await update(ref(db, `rooms/${roomCode}/game`), {
    currentTurnUid: getNextPlayerUid(game.currentTurnUid, playerOrder),
    turnStartTime: serverTimestamp(),
  })
}

// ── Advance to next round ───────────────────────────────

export async function advanceRound(roomCode, game, playerOrder, players) {
  const nextRound = game.round + 1

  if (nextRound > game.totalRounds) {
    // Game over — snapshot final scores into roundHistory
    const scores = {}
    for (const [uid, player] of Object.entries(players)) {
      scores[uid] = player.score
    }
    const updates = {
      [`roundHistory/${game.round}`]: {
        word: game.word,
        category: game.category,
        solverUid: game.solverUid,
        scores,
      },
      'game/state': GAME_STATES.GAME_OVER,
      'meta/status': 'finished',
    }
    await update(ref(db, `rooms/${roomCode}`), updates)
    return
  }

  // Snapshot this round
  const scores = {}
  for (const [uid, player] of Object.entries(players)) {
    scores[uid] = player.score
  }
  const roundSnapshot = {
    [`roundHistory/${game.round}`]: {
      word: game.word,
      category: game.category,
      solverUid: game.solverUid,
      scores,
    },
  }

  const { word, category } = pickWordForRound(nextRound - 1, game.categories)
  const startingPlayer = playerOrder[(nextRound - 1) % playerOrder.length]

  const updates = {
    ...roundSnapshot,
    game: {
      state: GAME_STATES.ROUND_START,
      round: nextRound,
      totalRounds: game.totalRounds,
      numRounds: game.numRounds,
      turnDuration: game.turnDuration ?? 30,
      categories: game.categories ?? null,
      currentTurnUid: startingPlayer,
      turnStartTime: serverTimestamp(),
      word,
      category,
      guessedLetters: {},
      wrongGuessCount: 0,
      wordSolved: false,
      solverUid: null,
    },
  }

  await update(ref(db, `rooms/${roomCode}`), updates)
}

// ── Promote new host ────────────────────────────────────

export async function promoteHost(roomCode, newHostUid) {
  await update(ref(db, `rooms/${roomCode}/meta`), { hostUid: newHostUid })
}

// ── Play Again (reset) ──────────────────────────────────

export async function resetGame(roomCode, playerOrder, players, numRounds = DEFAULT_NUM_ROUNDS) {
  // Read current meta for settings
  const metaSnap = await get(ref(db, `rooms/${roomCode}/meta`))
  const meta = metaSnap.val() || {}
  const turnDuration = meta.turnDuration ?? 30
  const categories = meta.categories ?? null

  // Reset all player scores
  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
  }

  const { word, category } = pickWordForRound(0, categories)
  const totalRounds = numRounds * playerOrder.length

  await update(ref(db, `rooms/${roomCode}`), {
    ...playerUpdates,
    roundHistory: null,
    'meta/status': 'in_progress',
    'meta/numRounds': numRounds,
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      totalRounds,
      numRounds,
      turnDuration,
      categories,
      currentTurnUid: playerOrder[0],
      turnStartTime: serverTimestamp(),
      word,
      category,
      guessedLetters: {},
      wrongGuessCount: 0,
      wordSolved: false,
      solverUid: null,
    },
  })
}

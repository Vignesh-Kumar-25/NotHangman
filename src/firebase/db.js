import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database'
import { db } from './config'
import { generateRoomCode } from '../utils/roomCode'
import { pickWord, pickWordForRound, isWordSolved, normalizeGuess } from '../utils/wordUtils'
import { getNextPlayerUid } from '../utils/turnUtils'
import {
  POINTS_CORRECT_LETTER,
  POINTS_CORRECT_WORD,
  POINTS_SOLVE_BONUS,
} from '../constants/gameConfig'
import { GAME_STATES } from '../constants/gameStates'

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
  if (Object.keys(room.players || {}).length >= 5) throw new Error('Room is full')

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
  // Append to playerOrder
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

  // If host leaving while in lobby, transfer host to next player
  if (room.meta.hostUid === uid && room.meta.status === 'lobby') {
    const newOrder = (room.playerOrder || []).filter((id) => id !== uid)
    if (newOrder.length > 0) {
      updates['meta/hostUid'] = newOrder[0]
      updates['playerOrder'] = newOrder
    }
  }

  await update(roomRef, updates)
}

// ── Game start ──────────────────────────────────────────

export async function startGame(roomCode, playerOrder) {
  const { word, category } = pickWordForRound(0)
  const totalRounds = playerOrder.length * 2

  const updates = {
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      totalRounds,
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
      // Reveal all letters for the end display
      for (const char of game.word) {
        updates[`game/guessedLetters/${char}`] = true
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
    // Reveal all letters
    for (const char of game.word) {
      updates[`game/guessedLetters/${char}`] = true
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

  const { word, category } = pickWordForRound(nextRound - 1)
  const startingPlayer = playerOrder[(nextRound - 1) % playerOrder.length]

  const updates = {
    ...roundSnapshot,
    game: {
      state: GAME_STATES.ROUND_START,
      round: nextRound,
      totalRounds: game.totalRounds,
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

export async function resetGame(roomCode, playerOrder, players) {
  // Reset all player scores
  const playerUpdates = {}
  for (const uid of playerOrder) {
    playerUpdates[`players/${uid}/score`] = 0
  }

  const { word, category } = pickWordForRound(0)
  const totalRounds = playerOrder.length * 2

  await update(ref(db, `rooms/${roomCode}`), {
    ...playerUpdates,
    roundHistory: null,
    'meta/status': 'in_progress',
    game: {
      state: GAME_STATES.ROUND_START,
      round: 1,
      totalRounds,
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

// ── Chat ────────────────────────────────────────────────

export function sendChatMessage(roomCode, uid, username, avatarId, text) {
  const trimmed = text.trim().slice(0, 200)
  if (!trimmed) return
  push(ref(db, `rooms/${roomCode}/chat`), {
    uid,
    username,
    avatarId,
    text: trimmed,
    timestamp: serverTimestamp(),
  })
}

// ── Subscriptions ───────────────────────────────────────

export function subscribeToRoom(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  return onValue(roomRef, (snap) => callback(snap.val()))
}

export function subscribeToChatMessages(roomCode, callback) {
  const chatRef = query(
    ref(db, `rooms/${roomCode}/chat`),
    orderByChild('timestamp'),
    limitToLast(50)
  )
  return onValue(chatRef, (snap) => {
    const messages = []
    snap.forEach((child) => {
      messages.push({ id: child.key, ...child.val() })
    })
    callback(messages)
  })
}

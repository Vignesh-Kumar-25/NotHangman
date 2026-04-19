import {
  ref,
  set,
  get,
  update,
  onDisconnect,
  push,
  runTransaction,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import { GAME_STATES, MAX_PLAYERS, DEFAULT_NUM_ROUNDS } from './constants/gameConfig'
import {
  createAcceptedBoard,
  evaluateBoard,
  refillBoard,
  scoreWord,
  shuffleBoard,
  swapBoardLetter,
  validatePath,
  wordFromPath,
  isWordAllowed,
} from './utils/boardUtils'

export async function createRoom(uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in')

  let roomCode
  for (let attempt = 0; attempt < 10; attempt++) {
    roomCode = generateRoomCode()
    const snapshot = await get(ref(db, `rooms/${roomCode}`))
    if (!snapshot.exists()) break
  }

  const now = Date.now()
  await set(ref(db, `rooms/${roomCode}`), {
    meta: {
      hostUid: uid,
      createdAt: now,
      status: GAME_STATES.LOBBY,
      roomCode,
      gameType: 'spellcast',
      numRounds: DEFAULT_NUM_ROUNDS,
    },
    players: {
      [uid]: {
        uid,
        username,
        avatarId,
        joinedAt: now,
        connected: true,
        score: 0,
        wordsFound: null,
      },
    },
    playerOrder: [uid],
    game: {
      state: GAME_STATES.LOBBY,
    },
  })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
  return roomCode
}

export async function joinRoom(roomCode, uid, username, avatarId) {
  if (!uid) throw new Error('Not signed in')
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) throw new Error('Room not found')

  const room = snapshot.val()
  if (room.meta?.gameType !== 'spellcast') throw new Error('This is not a Spellcast room')

  const players = room.players || {}
  if (players[uid]) {
    await update(ref(db, `rooms/${roomCode}/players/${uid}`), { connected: true })
    onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
    return
  }

  if (room.meta?.status !== GAME_STATES.LOBBY) {
    throw new Error('Spellcast match already started')
  }

  if (Object.keys(players).length >= MAX_PLAYERS) {
    throw new Error(`Room is full (max ${MAX_PLAYERS})`)
  }

  const order = Array.isArray(room.playerOrder) ? room.playerOrder : Object.values(room.playerOrder || {})
  const now = Date.now()
  await update(roomRef, {
    [`players/${uid}`]: {
      uid,
      username,
      avatarId,
      joinedAt: now,
      connected: true,
      score: 0,
      wordsFound: null,
    },
    playerOrder: [...order, uid],
  })

  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
}

export async function leaveRoom(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snapshot = await get(roomRef)
  if (!snapshot.exists()) return

  const room = snapshot.val()
  const order = Array.isArray(room.playerOrder) ? room.playerOrder : Object.values(room.playerOrder || {})

  if (room.meta?.status === GAME_STATES.LOBBY) {
    const nextOrder = order.filter((playerId) => playerId !== uid)
    if (nextOrder.length === 0) {
      await set(roomRef, null)
      return
    }

    const updates = {
      [`players/${uid}`]: null,
      playerOrder: nextOrder,
    }

    if (room.meta?.hostUid === uid) {
      updates['meta/hostUid'] = nextOrder[0]
    }

    await update(roomRef, updates)
    return
  }

  let rejection = 'Could not leave room'

  const result = await runTransaction(roomRef, (currentRoom) => {
    if (!currentRoom) {
      rejection = 'Room not found'
      return
    }

    const currentOrder = normalizePlayerOrder(currentRoom.playerOrder)
    const connectedOrder = currentOrder.filter(
      (playerId) => playerId !== uid && currentRoom.players?.[playerId]?.connected !== false
    )

    if (currentRoom.players?.[uid]) {
      currentRoom.players[uid].connected = false
    }

    if (currentRoom.meta?.hostUid === uid && connectedOrder.length > 0) {
      currentRoom.meta.hostUid = connectedOrder[0]
    }

    if (currentRoom.game?.state === GAME_STATES.PLAYING) {
      syncTurnState(currentRoom)
    }

    return currentRoom
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function startGame(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const snapshot = await get(roomRef)
  if (!snapshot.exists()) throw new Error('Room not found')

  const room = snapshot.val()
  const totalRounds = room.meta?.numRounds ?? DEFAULT_NUM_ROUNDS
  const { rows, metrics } = createAcceptedBoard()
  const now = Date.now()
  const players = room.players || {}
  const playerUpdates = {}

  Object.keys(players).forEach((playerId) => {
    playerUpdates[`players/${playerId}/score`] = 0
    playerUpdates[`players/${playerId}/wordsFound`] = null
  })

  await update(roomRef, {
    'meta/status': GAME_STATES.PLAYING,
    ...playerUpdates,
    game: {
      state: GAME_STATES.PLAYING,
      round: 1,
      totalRounds,
      turnOrder: getConnectedPlayerOrder(room),
      currentTurnIndex: 0,
      turnUtilityUsage: {},
      boardState: {
        version: 1,
        rows,
        metrics: summarizeMetrics(metrics),
        updatedAt: now,
      },
      foundWords: null,
      moves: null,
      lastMove: null,
      startedAt: now,
    },
  })
}

export async function submitWord(roomCode, uid, path, expectedVersion) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  const moveId = push(ref(db, `rooms/${roomCode}/game/moves`)).key
  let rejection = 'Move could not be applied'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const player = room.players?.[uid]
    if (!player || player.connected === false) {
      rejection = 'You are not active in this room'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== uid) {
      rejection = 'It is not your turn'
      return
    }

    const boardState = room.game?.boardState
    if (!boardState || boardState.version !== expectedVersion) {
      rejection = 'Board changed. Try again on the latest board.'
      return
    }

    if (!validatePath(path)) {
      rejection = 'That path is not valid'
      return
    }

    const word = wordFromPath(boardState.rows, path).toLowerCase()
    if (!isWordAllowed(word)) {
      rejection = `"${word.toUpperCase()}" is not in the spellbook`
      return
    }

    if (room.game?.foundWords?.[word]) {
      rejection = 'That word has already been cast'
      return
    }

    if (player.wordsFound?.[word]) {
      rejection = 'You already found that word'
      return
    }

    const refill = refillBoard(boardState.rows, path, room.game?.foundWords || {})
    if (!refill) {
      rejection = 'The board could not stabilize after that word'
      return
    }

    const nextVersion = boardState.version + 1
    const now = Date.now()
    const points = scoreWord(word)
    const nextMetrics = summarizeMetrics(refill.metrics || evaluateBoard(refill.rows))

    room.players[uid].score = (room.players[uid].score || 0) + points
    if (!room.players[uid].wordsFound) room.players[uid].wordsFound = {}
    room.players[uid].wordsFound[word] = now

    if (!room.game.foundWords) room.game.foundWords = {}
    room.game.foundWords[word] = {
      uid,
      score: points,
      length: word.length,
      createdAt: now,
    }

    if (!room.game.moves) room.game.moves = {}
    room.game.moves[moveId] = {
      uid,
      word,
      path,
      score: points,
      boardVersionBefore: boardState.version,
      boardVersionAfter: nextVersion,
      createdAt: now,
    }

    room.game.lastMove = {
      uid,
      word,
      score: points,
      path,
      refillWord: refill.refillWord,
      createdAt: now,
    }

    room.game.boardState = {
      version: nextVersion,
      rows: refill.rows,
      metrics: nextMetrics,
      updatedAt: now,
    }

    advanceTurn(room)

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function finishMatch(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Match could not be advanced'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    room.meta.status = GAME_STATES.FINISHED
    room.game.state = GAME_STATES.FINISHED

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function reshuffleBoard(roomCode, uid, expectedVersion) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Board could not be shuffled'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const player = room.players?.[uid]
    if (!player || player.connected === false) {
      rejection = 'You are not active in this room'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== uid) {
      rejection = 'It is not your turn'
      return
    }
    if (hasUsedTurnUtility(room, 'shuffle')) {
      rejection = 'You already used shuffle this turn'
      return
    }

    const boardState = room.game?.boardState
    if (!boardState || boardState.version !== expectedVersion) {
      rejection = 'Board changed. Try again on the latest board.'
      return
    }

    const shuffled = shuffleBoard(boardState.rows)
    if (!shuffled) {
      rejection = 'No accepted shuffle was found'
      return
    }

    const now = Date.now()
    room.game.lastMove = {
      uid,
      action: 'shuffle',
      createdAt: now,
    }
    markTurnUtilityUsed(room, 'shuffle')
    room.game.boardState = {
      version: boardState.version + 1,
      rows: shuffled.rows,
      metrics: summarizeMetrics(shuffled.metrics || evaluateBoard(shuffled.rows)),
      updatedAt: now,
    }

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function swapLetter(roomCode, uid, tileIndex, nextLetter, expectedVersion) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Letter could not be swapped'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const player = room.players?.[uid]
    if (!player || player.connected === false) {
      rejection = 'You are not active in this room'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== uid) {
      rejection = 'It is not your turn'
      return
    }
    if (hasUsedTurnUtility(room, 'swap')) {
      rejection = 'You already used swap this turn'
      return
    }

    const boardState = room.game?.boardState
    if (!boardState || boardState.version !== expectedVersion) {
      rejection = 'Board changed. Try again on the latest board.'
      return
    }

    const swapped = swapBoardLetter(boardState.rows, tileIndex, nextLetter)
    if (!swapped) {
      rejection = 'That swap would destabilize the board'
      return
    }

    const now = Date.now()
    room.game.lastMove = {
      uid,
      action: 'swap',
      tileIndex,
      nextLetter,
      createdAt: now,
    }
    markTurnUtilityUsed(room, 'swap')
    room.game.boardState = {
      version: boardState.version + 1,
      rows: swapped.rows,
      metrics: summarizeMetrics(swapped.metrics || evaluateBoard(swapped.rows)),
      updatedAt: now,
    }

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function useHint(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Hint could not be used'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const player = room.players?.[uid]
    if (!player || player.connected === false) {
      rejection = 'You are not active in this room'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== uid) {
      rejection = 'It is not your turn'
      return
    }
    if (hasUsedTurnUtility(room, 'hint')) {
      rejection = 'You already used hint this turn'
      return
    }

    room.game.lastMove = {
      uid,
      action: 'hint',
      createdAt: Date.now(),
    }
    markTurnUtilityUsed(room, 'hint')

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function returnToLobby(roomCode) {
  await update(ref(db, `rooms/${roomCode}`), {
    'meta/status': GAME_STATES.LOBBY,
    game: {
      state: GAME_STATES.LOBBY,
    },
  })
}

export async function setRoomNumRounds(roomCode, numRounds) {
  await update(ref(db, `rooms/${roomCode}/meta`), { numRounds })
}

function summarizeMetrics(metrics) {
  return {
    accepted: metrics.accepted,
    score: Number(metrics.score.toFixed(2)),
    totalWords: metrics.totalWords,
    commonWords: metrics.commonWords,
    longestWord: metrics.longestWord,
    vowelRatio: Number(metrics.vowelRatio.toFixed(2)),
    startCellCoverage: metrics.startCellCoverage,
    identicalNeighborCount: metrics.identicalNeighborCount,
    failureTags: metrics.failureTags,
    countsByLength: metrics.countsByLength,
  }
}

function normalizePlayerOrder(playerOrder) {
  return Array.isArray(playerOrder) ? playerOrder : Object.values(playerOrder || {})
}

function getConnectedPlayerOrder(room) {
  return normalizePlayerOrder(room.playerOrder).filter(
    (playerId) => room.players?.[playerId]?.connected !== false
  )
}

function getTurnState(room) {
  const turnOrder = Array.isArray(room.game?.turnOrder) ? room.game.turnOrder : getConnectedPlayerOrder(room)
  const activeTurnOrder = turnOrder.filter((playerId) => room.players?.[playerId]?.connected !== false)
  const currentTurnIndex = Math.min(room.game?.currentTurnIndex || 0, Math.max(activeTurnOrder.length - 1, 0))
  const currentTurnUid = activeTurnOrder[currentTurnIndex] || null
  return { activeTurnOrder, currentTurnIndex, currentTurnUid }
}

function syncTurnState(room) {
  const previousTurnUid = getTurnState(room).currentTurnUid
  const { activeTurnOrder, currentTurnIndex } = getTurnState(room)

  if (!activeTurnOrder.length) {
    room.meta.status = GAME_STATES.FINISHED
    room.game.state = GAME_STATES.FINISHED
    room.game.turnOrder = []
    room.game.currentTurnIndex = 0
    room.game.turnUtilityUsage = {}
    return
  }

  room.game.turnOrder = activeTurnOrder
  room.game.currentTurnIndex = Math.min(currentTurnIndex, activeTurnOrder.length - 1)
  if (previousTurnUid !== activeTurnOrder[room.game.currentTurnIndex]) {
    room.game.turnUtilityUsage = {}
  }
}

function advanceTurn(room) {
  const { activeTurnOrder, currentTurnIndex } = getTurnState(room)

  if (!activeTurnOrder.length) {
    room.meta.status = GAME_STATES.FINISHED
    room.game.state = GAME_STATES.FINISHED
    room.game.turnOrder = []
    room.game.currentTurnIndex = 0
    room.game.turnUtilityUsage = {}
    return
  }

  if (currentTurnIndex + 1 < activeTurnOrder.length) {
    room.game.turnOrder = activeTurnOrder
    room.game.currentTurnIndex = currentTurnIndex + 1
    room.game.turnUtilityUsage = {}
    return
  }

  const currentRound = room.game?.round || 1
  const totalRounds = room.game?.totalRounds || DEFAULT_NUM_ROUNDS

  if (currentRound >= totalRounds) {
    room.meta.status = GAME_STATES.FINISHED
    room.game.state = GAME_STATES.FINISHED
    room.game.turnOrder = activeTurnOrder
    room.game.currentTurnIndex = activeTurnOrder.length - 1
    room.game.turnUtilityUsage = {}
    return
  }

  const nextTurnOrder = getConnectedPlayerOrder(room)

  room.game.round = currentRound + 1
  room.game.totalRounds = totalRounds
  room.game.turnOrder = nextTurnOrder
  room.game.currentTurnIndex = 0
  room.game.turnUtilityUsage = {}
}

function hasUsedTurnUtility(room, utilityName) {
  return Boolean(room.game?.turnUtilityUsage?.[utilityName])
}

function markTurnUtilityUsed(room, utilityName) {
  if (!room.game.turnUtilityUsage) {
    room.game.turnUtilityUsage = {}
  }
  room.game.turnUtilityUsage[utilityName] = true
}

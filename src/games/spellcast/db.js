import {
  ref,
  set,
  get,
  update,
  onDisconnect,
  onValue,
  push,
  runTransaction,
} from 'firebase/database'
import { db } from '@/firebase/config'
import { generateRoomCode } from '@/utils/roomCode'
import {
  GAME_STATES,
  MAX_PLAYERS,
  DEFAULT_NUM_ROUNDS,
  DEFAULT_TURN_TIMER_SECONDS,
  MIN_TURN_TIMER_POWER_UP_SECONDS,
  TURN_TIMER_POWER_UP_DISABLE_THRESHOLD_SECONDS,
  DEFAULT_GEM_COUNT,
  DEFAULT_POWER_UP_COUNTS,
  POWER_UP_GEM_COSTS,
} from './constants/gameConfig'
import {
  buildGemTiles,
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
      turnTimerSeconds: DEFAULT_TURN_TIMER_SECONDS,
      turnTimerPowerUpEnabled: false,
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

export async function reconnectRoomPresence(roomCode, uid) {
  if (!roomCode || !uid) return false

  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`)
  const snapshot = await get(playerRef)
  if (!snapshot.exists()) return false

  await update(playerRef, { connected: true })
  onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}/connected`)).set(false)
  return true
}

export function subscribeToPresenceConnection(callback) {
  return onValue(ref(db, '.info/connected'), (snapshot) => {
    callback(Boolean(snapshot.val()))
  })
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
  const turnTimerSeconds = room.meta?.turnTimerSeconds ?? DEFAULT_TURN_TIMER_SECONDS
  const turnTimerPowerUpEnabled =
    Boolean(room.meta?.turnTimerPowerUpEnabled) && turnTimerSeconds >= MIN_TURN_TIMER_POWER_UP_SECONDS
  const { rows, metrics } = createAcceptedBoard()
  const gemTiles = buildGemTiles(rows)
  const now = Date.now()
  const turnOrder = getConnectedPlayerOrder(room)
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
      turnTimerSeconds,
      turnTimerPowerUpEnabled,
      turnOrder,
      currentTurnIndex: 0,
      turnUtilityUsage: {},
      gemBalances: buildGemBalances(players),
      utilityStocks: buildUtilityStocks(players),
      liveSelection: null,
      turnTimer: turnTimerSeconds > 0 && turnOrder.length > 0
        ? {
            uid: 'system',
            turnUid: turnOrder[0],
            startedAt: now,
            endsAt: now + turnTimerSeconds * 1000,
            durationMs: turnTimerSeconds * 1000,
          }
        : null,
      boardState: {
        version: 1,
        rows,
        gemTiles,
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

    const refill = refillBoard(boardState.rows, path, room.game?.foundWords || {})
    if (!refill) {
      rejection = 'The board could not stabilize after that word'
      return
    }

    const nextVersion = boardState.version + 1
    const now = Date.now()
    const points = scoreWord(word)
    const gemsCollected = path.reduce((total, index) => total + (boardState.gemTiles?.[index] || 0), 0)
    const nextMetrics = summarizeMetrics(refill.metrics || evaluateBoard(refill.rows))
    const nextGemTiles = buildGemTiles(refill.rows, boardState.gemTiles || {}, path)

    room.players[uid].score = (room.players[uid].score || 0) + points
    if (!room.players[uid].wordsFound) room.players[uid].wordsFound = {}
    room.players[uid].wordsFound[word] = now
    if (!room.game.gemBalances) {
      room.game.gemBalances = buildGemBalances(room.players || {})
    }
    room.game.gemBalances[uid] = (room.game.gemBalances[uid] || 0) + gemsCollected

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
      action: 'cast',
      word,
      score: points,
      path,
      refillWord: refill.refillWord,
      gemsCollected,
      createdAt: now,
    }
    room.game.liveSelection = null

    room.game.boardState = {
      version: nextVersion,
      rows: refill.rows,
      gemTiles: nextGemTiles,
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
    if (getUtilityStock(room, uid, 'shuffle') <= 0) {
      rejection = 'You are out of shuffles'
      return
    }
    if (getGemBalance(room, uid) < POWER_UP_GEM_COSTS.shuffle) {
      rejection = 'You need more gems to shuffle'
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
    const nextGemTiles = buildGemTiles(
      shuffled.rows,
      boardState.gemTiles || {},
      shuffled.rows.flat().map((_, index) => index),
    )
    room.game.lastMove = {
      uid,
      action: 'shuffle',
      createdAt: now,
    }
    room.game.liveSelection = null
    markTurnUtilityUsed(room, 'shuffle')
    spendUtility(room, uid, 'shuffle')
    spendGems(room, uid, POWER_UP_GEM_COSTS.shuffle)
    room.game.boardState = {
      version: boardState.version + 1,
      rows: shuffled.rows,
      gemTiles: nextGemTiles,
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
    if (getUtilityStock(room, uid, 'swap') <= 0) {
      rejection = 'You are out of swaps'
      return
    }
    if (getGemBalance(room, uid) < POWER_UP_GEM_COSTS.swap) {
      rejection = 'You need more gems to swap'
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
    const previousGemTiles = boardState.gemTiles || {}
    const nextGemTiles = previousGemTiles[tileIndex]
      ? {
          ...buildGemTiles(swapped.rows, previousGemTiles, [tileIndex]),
          [tileIndex]: previousGemTiles[tileIndex],
        }
      : buildGemTiles(swapped.rows, previousGemTiles, [tileIndex])
    room.game.lastMove = {
      uid,
      action: 'swap',
      tileIndex,
      nextLetter,
      createdAt: now,
    }
    room.game.liveSelection = null
    markTurnUtilityUsed(room, 'swap')
    spendUtility(room, uid, 'swap')
    spendGems(room, uid, POWER_UP_GEM_COSTS.swap)
    room.game.boardState = {
      version: boardState.version + 1,
      rows: swapped.rows,
      gemTiles: nextGemTiles,
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
    if (getUtilityStock(room, uid, 'hint') <= 0) {
      rejection = 'You are out of hints'
      return
    }
    if (getGemBalance(room, uid) < POWER_UP_GEM_COSTS.hint) {
      rejection = 'You need more gems to use a hint'
      return
    }

    room.game.lastMove = {
      uid,
      action: 'hint',
      createdAt: Date.now(),
    }
    markTurnUtilityUsed(room, 'hint')
    spendUtility(room, uid, 'hint')
    spendGems(room, uid, POWER_UP_GEM_COSTS.hint)

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

export async function setRoomTurnTimer(roomCode, turnTimerSeconds) {
  await update(ref(db, `rooms/${roomCode}/meta`), { turnTimerSeconds })
}

export async function updateLiveSelection(roomCode, uid, path, boardVersion) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Selection could not be updated'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== uid) {
      rejection = 'It is not your turn'
      return
    }

    if (room.game?.boardState?.version !== boardVersion) {
      rejection = 'Board changed. Try again on the latest board.'
      return
    }

    room.game.liveSelection = path.length
      ? {
          uid,
          path,
          boardVersion,
          updatedAt: Date.now(),
        }
      : null

    return room
  })

  if (!result.committed && rejection !== 'It is not your turn' && rejection !== 'Board changed. Try again on the latest board.') {
    throw new Error(rejection)
  }
}

export async function triggerTurnTimer(roomCode, uid) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Timer could not be started'

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
    if (!turnState.currentTurnUid) {
      rejection = 'No active turn'
      return
    }
    const configuredTurnTimerSeconds = room.game?.turnTimerSeconds || room.meta?.turnTimerSeconds || DEFAULT_TURN_TIMER_SECONDS
    const turnTimerPowerUpEnabled =
      Boolean(room.game?.turnTimerPowerUpEnabled ?? room.meta?.turnTimerPowerUpEnabled) &&
      configuredTurnTimerSeconds >= MIN_TURN_TIMER_POWER_UP_SECONDS
    if (!turnTimerPowerUpEnabled) {
      rejection = 'Turn timer is disabled for this match'
      return
    }
    if (turnState.currentTurnUid === uid) {
      rejection = 'You cannot time your own turn'
      return
    }
    const currentTimer = room.game?.turnTimer
    const activeTurnAlreadyHasPlayerTriggeredTimer =
      currentTimer?.turnUid === turnState.currentTurnUid && currentTimer?.uid && currentTimer.uid !== 'system'
    if (activeTurnAlreadyHasPlayerTriggeredTimer) {
      rejection = 'Timer already started for this turn'
      return
    }
    const currentRemainingMs = currentTimer?.turnUid === turnState.currentTurnUid
      ? Math.max(0, (currentTimer.endsAt || 0) - Date.now())
      : 0
    if (currentRemainingMs <= TURN_TIMER_POWER_UP_DISABLE_THRESHOLD_SECONDS * 1000) {
      rejection = 'Not enough time remains to trigger the timer'
      return
    }

    const now = Date.now()
    const durationMs = 10 * 1000
    room.game.turnTimer = {
      uid,
      turnUid: turnState.currentTurnUid,
      startedAt: now,
      endsAt: now + durationMs,
      durationMs,
    }
    room.game.lastMove = {
      uid,
      action: 'turn_timer',
      turnUid: turnState.currentTurnUid,
      createdAt: now,
    }

    return room
  })

  if (!result.committed) {
    throw new Error(rejection)
  }
}

export async function expireTurnTimer(roomCode, turnUid, endedAt) {
  const roomRef = ref(db, `rooms/${roomCode}`)
  let rejection = 'Timer could not expire'

  const result = await runTransaction(roomRef, (room) => {
    if (!room) {
      rejection = 'Room not found'
      return
    }

    if (room.meta?.gameType !== 'spellcast' || room.game?.state !== GAME_STATES.PLAYING) {
      rejection = 'Spellcast match is not active'
      return
    }

    const timer = room.game?.turnTimer
    if (!timer || timer.turnUid !== turnUid) {
      rejection = 'Timer no longer applies'
      return
    }

    const turnState = getTurnState(room)
    if (turnState.currentTurnUid !== turnUid) {
      room.game.turnTimer = buildAutoTurnTimer(room)
      return room
    }

    if ((timer.endsAt || 0) > endedAt) {
      rejection = 'Timer is still running'
      return
    }

    room.game.lastMove = {
      uid: timer.uid,
      action: 'turn_timeout',
      turnUid,
      createdAt: endedAt,
    }
    advanceTurn(room)

    return room
  })

  if (!result.committed && rejection !== 'Timer no longer applies' && rejection !== 'Timer is still running') {
    throw new Error(rejection)
  }
}

export async function setTurnTimerPowerUpEnabled(roomCode, turnTimerPowerUpEnabled) {
  await update(ref(db, `rooms/${roomCode}/meta`), { turnTimerPowerUpEnabled })
}

function summarizeMetrics(metrics) {
  return {
    accepted: metrics.accepted,
    score: Number(metrics.score.toFixed(2)),
    totalWords: metrics.totalWords,
    commonWords: metrics.commonWords,
    longestWord: metrics.longestWord,
    longestWordText: metrics.longestWordText || '',
    vowelRatio: Number(metrics.vowelRatio.toFixed(2)),
    startCellCoverage: metrics.startCellCoverage,
    identicalNeighborCount: metrics.identicalNeighborCount,
    failureTags: metrics.failureTags,
    countsByLength: metrics.countsByLength,
  }
}

function buildGemBalances(players) {
  return Object.keys(players || {}).reduce((balances, playerId) => {
    balances[playerId] = DEFAULT_GEM_COUNT
    return balances
  }, {})
}

function buildUtilityStocks(players) {
  return Object.keys(players || {}).reduce((stocks, playerId) => {
    stocks[playerId] = { ...DEFAULT_POWER_UP_COUNTS }
    return stocks
  }, {})
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
    room.game.liveSelection = null
    room.game.turnTimer = null
    return
  }

  room.game.turnOrder = activeTurnOrder
  room.game.currentTurnIndex = Math.min(currentTurnIndex, activeTurnOrder.length - 1)
  if (previousTurnUid !== activeTurnOrder[room.game.currentTurnIndex]) {
    room.game.turnUtilityUsage = {}
    resetUtilityStocks(room, activeTurnOrder)
    room.game.liveSelection = null
    room.game.turnTimer = buildAutoTurnTimer(room)
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
    room.game.liveSelection = null
    room.game.turnTimer = null
    return
  }

  if (currentTurnIndex + 1 < activeTurnOrder.length) {
    room.game.turnOrder = activeTurnOrder
    room.game.currentTurnIndex = currentTurnIndex + 1
    room.game.turnUtilityUsage = {}
    resetUtilityStocks(room, activeTurnOrder)
    room.game.liveSelection = null
    room.game.turnTimer = buildAutoTurnTimer(room)
    return
  }

  if (activeTurnOrder.length === 1) {
    advanceRound(room, activeTurnOrder)
    return
  }

  advanceRound(room, getConnectedPlayerOrder(room))
}

function advanceRound(room, nextTurnOrder) {
  const currentRound = room.game?.round || 1
  const totalRounds = room.game?.totalRounds || DEFAULT_NUM_ROUNDS

  if (currentRound >= totalRounds) {
    room.meta.status = GAME_STATES.FINISHED
    room.game.state = GAME_STATES.FINISHED
    room.game.turnOrder = nextTurnOrder
    room.game.currentTurnIndex = Math.max(nextTurnOrder.length - 1, 0)
    room.game.turnUtilityUsage = {}
    room.game.liveSelection = null
    room.game.turnTimer = null
    return
  }

  const nextRound = currentRound + 1

  room.game.round = nextRound
  room.game.totalRounds = totalRounds
  room.game.turnOrder = nextTurnOrder
  room.game.currentTurnIndex = 0
  room.game.turnUtilityUsage = {}
  resetUtilityStocks(room, nextTurnOrder)
  room.game.liveSelection = null
  room.game.turnTimer = buildAutoTurnTimer(room)
}

function buildAutoTurnTimer(room) {
  const seconds = room.game?.turnTimerSeconds || 0
  if (seconds <= 0) return null
  const { currentTurnUid } = getTurnState(room)
  if (!currentTurnUid) return null
  const now = Date.now()
  return {
    uid: 'system',
    turnUid: currentTurnUid,
    startedAt: now,
    endsAt: now + seconds * 1000,
    durationMs: seconds * 1000,
  }
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

function getGemBalance(room, uid) {
  return room.game?.gemBalances?.[uid] || 0
}

function getUtilityStock(room, uid, utilityName) {
  return room.game?.utilityStocks?.[uid]?.[utilityName] || 0
}

function spendUtility(room, uid, utilityName) {
  if (!room.game.utilityStocks) {
    room.game.utilityStocks = {}
  }
  if (!room.game.utilityStocks[uid]) {
    room.game.utilityStocks[uid] = { ...DEFAULT_POWER_UP_COUNTS }
  }
  room.game.utilityStocks[uid][utilityName] = Math.max(0, (room.game.utilityStocks[uid][utilityName] || 0) - 1)
}

function spendGems(room, uid, amount) {
  if (!room.game.gemBalances) {
    room.game.gemBalances = {}
  }
  room.game.gemBalances[uid] = Math.max(0, (room.game.gemBalances[uid] || 0) - amount)
}

function resetUtilityStocks(room, playerOrder = []) {
  if (!room.game.utilityStocks) {
    room.game.utilityStocks = {}
  }

  playerOrder.forEach((playerId) => {
    room.game.utilityStocks[playerId] = { ...DEFAULT_POWER_UP_COUNTS }
  })
}

import { DEFAULT_NUM_ROUNDS } from '../constants/gameConfig'

export function useGameState(room, uid) {
  if (!room) return {}

  const players = room.players || {}
  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})
  const game = room.game || {}
  const meta = room.meta || {}
  const me = players[uid]
  const isHost = meta.hostUid === uid
  const connectedPlayers = playerOrder.filter((playerId) => players[playerId]?.connected !== false)
  const turnOrder = Array.isArray(game.turnOrder) ? game.turnOrder : connectedPlayers
  const boardState = game.boardState || null
  const foundWords = Object.entries(game.foundWords || {})
    .map(([word, data]) => ({ word, ...data }))
    .sort((left, right) => right.createdAt - left.createdAt)
  const leaderboard = connectedPlayers
    .map((playerId) => ({
      ...players[playerId],
      uid: playerId,
      score: players[playerId]?.score || 0,
      foundCount: Object.keys(players[playerId]?.wordsFound || {}).length,
    }))
    .sort((left, right) => right.score - left.score || left.joinedAt - right.joinedAt)

  const winner = leaderboard[0] || null
  const currentRound = game.round || 1
  const totalRounds = game.totalRounds || meta.numRounds || DEFAULT_NUM_ROUNDS
  const currentTurnUid = turnOrder[game.currentTurnIndex || 0] || connectedPlayers[0] || null
  const currentPlayer = currentTurnUid ? players[currentTurnUid] : null
  const isMyTurn = currentTurnUid === uid
  const turnUtilityUsage = game.turnUtilityUsage || {}
  const liveSelection = game.liveSelection || null
  const turnTimer = game.turnTimer || null
  const gemBalances = game.gemBalances || {}
  const utilityStocks = game.utilityStocks || {}
  const myGemBalance = gemBalances[uid] || 0
  const myUtilityStock = utilityStocks[uid] || { hint: 0, shuffle: 0, swap: 0 }

  return {
    players,
    playerOrder,
    game,
    meta,
    me,
    isHost,
    connectedPlayers,
    turnOrder,
    boardState,
    foundWords,
    leaderboard,
    winner,
    currentRound,
    totalRounds,
    currentTurnUid,
    currentPlayer,
    isMyTurn,
    turnUtilityUsage,
    liveSelection,
    turnTimer,
    gemBalances,
    utilityStocks,
    myGemBalance,
    myUtilityStock,
  }
}

export function useGameState(room, uid) {
  if (!room) return {}

  const game = room.game || {}
  const players = room.players || {}
  const playerOrder = Array.isArray(room.playerOrder)
    ? room.playerOrder
    : Object.values(room.playerOrder || {})
  const meta = room.meta || {}

  const isHost = meta.hostUid === uid
  const me = players[uid]
  const eliminated = game.eliminatedPlayers || {}

  const connectedPlayers = playerOrder.filter(
    (id) => players[id]?.connected !== false
  )

  const alivePlayers = playerOrder.filter(
    (id) => !eliminated[id] && players[id]?.connected !== false
  )

  const currentPlayerUid = playerOrder[game.currentTurnIndex] || null
  const isMyTurn = currentPlayerUid === uid && !eliminated[uid]
  const amEliminated = !!eliminated[uid]

  return {
    game,
    players,
    playerOrder,
    meta,
    isHost,
    me,
    connectedPlayers,
    alivePlayers,
    currentPlayerUid,
    isMyTurn,
    amEliminated,
    eliminated,
  }
}

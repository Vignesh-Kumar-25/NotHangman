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

  const connectedPlayers = playerOrder.filter(
    (id) => players[id]?.connected !== false
  )

  const myColor = game.whiteUid === uid ? 'w' : game.blackUid === uid ? 'b' : null
  const isMyTurn = game.currentTurn === myColor

  return {
    game,
    players,
    playerOrder,
    meta,
    isHost,
    me,
    connectedPlayers,
    myColor,
    isMyTurn,
  }
}

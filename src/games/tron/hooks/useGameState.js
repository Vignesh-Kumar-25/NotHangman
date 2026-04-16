export function useGameState(room, uid) {
  if (!room) return {}

  const game = room.game || {}
  const players = room.players || {}
  const playerOrder = room.playerOrder || []
  const meta = room.meta || {}

  const isHost = meta.hostUid === uid
  const me = players[uid]

  const connectedPlayers = playerOrder.filter(
    (id) => players[id]?.connected !== false
  )

  return {
    game,
    players,
    playerOrder,
    meta,
    isHost,
    me,
    connectedPlayers,
  }
}

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
  const runs = game.runs || {}

  const connectedPlayers = playerOrder.filter(
    (id) => players[id]?.connected !== false
  )

  const alivePlayers = connectedPlayers.filter(
    (id) => runs[id]?.alive !== false
  )

  const myRun = runs[uid] || null
  const amCrashed = !!myRun && myRun.alive === false

  return {
    game,
    players,
    playerOrder,
    meta,
    isHost,
    me,
    connectedPlayers,
    alivePlayers,
    runs,
    myRun,
    amCrashed,
  }
}

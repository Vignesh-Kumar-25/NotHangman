import { maskWord } from '../utils/wordUtils'

export function useGameState(room, uid) {
  if (!room) return {}

  const game = room.game || {}
  const players = room.players || {}
  const playerOrder = room.playerOrder || []
  const meta = room.meta || {}

  const isHost = meta.hostUid === uid
  const isMyTurn = game.currentTurnUid === uid
  const me = players[uid]

  const maskedWord = game.word
    ? maskWord(game.word, game.guessedLetters || {})
    : []

  const connectedPlayers = playerOrder.filter(
    (id) => players[id]?.connected !== false
  )

  return {
    game,
    players,
    playerOrder,
    meta,
    isHost,
    isMyTurn,
    me,
    maskedWord,
    connectedPlayers,
  }
}

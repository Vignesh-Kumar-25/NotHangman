import { useEffect, useRef } from 'react'
import { passTurn, advanceRound, beginPlaying, promoteHost } from '../firebase/db'
import { GAME_STATES } from '../constants/gameStates'
import { ROUND_START_DELAY, ROUND_END_DELAY } from '../constants/gameConfig'

export function useHostArbiter({ isHost, room, roomCode, timeLeft, uid }) {
  const lastHandledTurnStart = useRef(null)
  const advancedRound = useRef(null)
  const promotedRef = useRef(false)

  const game = room?.game
  const players = room?.players || {}
  const playerOrder = room?.playerOrder || []
  const meta = room?.meta || {}

  // ── Host reassignment on disconnect ──────────────────
  useEffect(() => {
    if (!room || !uid || promotedRef.current) return
    const hostUid = meta.hostUid
    const hostPlayer = players[hostUid]

    if (hostPlayer && hostPlayer.connected === false) {
      // Find connected player with lowest joinedAt
      const connectedIds = playerOrder.filter((id) => players[id]?.connected !== false)
      if (connectedIds.length === 0) return

      const newHost = connectedIds.reduce((best, id) => {
        return (players[id].joinedAt ?? Infinity) < (players[best].joinedAt ?? Infinity) ? id : best
      })

      if (newHost === uid) {
        promotedRef.current = true
        promoteHost(roomCode, uid).catch(console.error)
      }
    }
  }, [room, uid, roomCode, meta, players, playerOrder])

  // ── ROUND_START → PLAYING ─────────────────────────────
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.ROUND_START) return

    const timeout = setTimeout(() => {
      beginPlaying(roomCode).catch(console.error)
    }, ROUND_START_DELAY)

    return () => clearTimeout(timeout)
  }, [isHost, game?.state, game?.round, roomCode])

  // ── Timer expiry → pass turn ──────────────────────────
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.PLAYING) return
    if (timeLeft > 0) return

    const turnStart = game.turnStartTime
    if (lastHandledTurnStart.current === turnStart) return
    lastHandledTurnStart.current = turnStart

    passTurn(roomCode, game, playerOrder).catch(console.error)
  }, [isHost, timeLeft, game?.state, game?.turnStartTime, roomCode, playerOrder])

  // ── ROUND_END → next round / game over ─────────────────
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.ROUND_END) return
    if (advancedRound.current === game.round) return
    advancedRound.current = game.round

    const timeout = setTimeout(() => {
      advanceRound(roomCode, game, playerOrder, players).catch(console.error)
    }, ROUND_END_DELAY)

    return () => clearTimeout(timeout)
  }, [isHost, game?.state, game?.round, roomCode, playerOrder, players])
}

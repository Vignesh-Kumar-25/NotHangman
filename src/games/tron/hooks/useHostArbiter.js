import { useEffect, useRef } from 'react'
import { beginPlaying, endRound, advanceRound, promoteHost } from '../db'
import { GAME_STATES } from '../constants/gameStates'
import { COUNTDOWN_DURATION, ROUND_END_DELAY } from '../constants/gameConfig'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'

export function useHostArbiter({ isHost, room, roomCode, uid, engineRef }) {
  const countdownRef = useRef(null)
  const roundEndRef = useRef(null)
  const promotedRef = useRef(false)
  const roundEndedRef = useRef(null)

  const game = room?.game
  const players = room?.players || {}
  const playerOrder = room?.playerOrder || []
  const meta = room?.meta || {}

  // Host reassignment
  useEffect(() => {
    if (!room || !uid || promotedRef.current) return
    const hostPlayer = players[meta.hostUid]
    if (hostPlayer && hostPlayer.connected === false) {
      const connected = playerOrder.filter((id) => players[id]?.connected !== false)
      if (connected.length === 0) return
      const newHost = connected.reduce((best, id) =>
        (players[id].joinedAt ?? Infinity) < (players[best].joinedAt ?? Infinity) ? id : best
      )
      if (newHost === uid) {
        promotedRef.current = true
        promoteHost(roomCode, uid).catch(console.error)
      }
    }
  }, [room, uid, roomCode, meta, players, playerOrder])

  // COUNTDOWN -> PLAYING
  useEffect(() => {
    if (!isHost || game?.state !== GAME_STATES.COUNTDOWN) return
    countdownRef.current = setTimeout(() => {
      beginPlaying(roomCode).catch(console.error)
    }, COUNTDOWN_DURATION * 1000)
    return () => clearTimeout(countdownRef.current)
  }, [isHost, game?.state, game?.round, roomCode])

  // Detect round end from engine (host only)
  useEffect(() => {
    if (!isHost || game?.state !== GAME_STATES.PLAYING) return
    const check = setInterval(() => {
      const engine = engineRef?.current
      if (!engine || engine.running) return
      if (roundEndedRef.current === game.round) return
      roundEndedRef.current = game.round

      const killMap = {}
      for (const d of engine.deaths) {
        killMap[d.uid] = { killedBy: d.killedBy }
      }
      endRound(roomCode, game, players, engine.getWinner(), killMap).catch(console.error)
      clearInterval(check)
    }, 100)
    return () => clearInterval(check)
  }, [isHost, game?.state, game?.round, roomCode, players, engineRef])

  // ROUND_END -> next round
  useEffect(() => {
    if (!isHost || game?.state !== GAME_STATES.ROUND_END) return
    roundEndRef.current = setTimeout(() => {
      advanceRound(roomCode, game, playerOrder).catch(console.error)
    }, ROUND_END_DELAY)
    return () => clearTimeout(roundEndRef.current)
  }, [isHost, game?.state, game?.round, roomCode, playerOrder])

  // Round timer expiry
  const serverTimeOffset = useServerTimeOffset()
  useEffect(() => {
    if (!isHost || game?.state !== GAME_STATES.PLAYING || !game.roundStartTime) return
    const roundDuration = meta.roundDuration || 90
    const serverNow = Date.now() + (serverTimeOffset || 0)
    const remaining = roundDuration - (serverNow - game.roundStartTime) / 1000

    if (remaining <= 0) {
      if (roundEndedRef.current !== game.round && engineRef?.current) {
        roundEndedRef.current = game.round
        engineRef.current.running = false
        const killMap = {}
        for (const d of engineRef.current.deaths) killMap[d.uid] = { killedBy: d.killedBy }
        endRound(roomCode, game, players, engineRef.current.getWinner(), killMap).catch(console.error)
      }
      return
    }

    const timeout = setTimeout(() => {
      if (roundEndedRef.current !== game.round && engineRef?.current) {
        roundEndedRef.current = game.round
        engineRef.current.running = false
        const killMap = {}
        for (const d of engineRef.current.deaths) killMap[d.uid] = { killedBy: d.killedBy }
        endRound(roomCode, game, players, engineRef.current.getWinner(), killMap).catch(console.error)
      }
    }, remaining * 1000)
    return () => clearTimeout(timeout)
  }, [isHost, game?.state, game?.round, game?.roundStartTime, roomCode, serverTimeOffset, meta, players, engineRef])
}

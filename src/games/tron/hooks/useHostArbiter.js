import { useEffect, useRef } from 'react'
import { beginPlaying, endRound, advanceRound, promoteHost } from '../db'
import { GAME_STATES } from '../constants/gameStates'
import { COUNTDOWN_DURATION, ROUND_END_DELAY } from '../constants/gameConfig'
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset'

export function useHostArbiter({ isHost, room, roomCode, uid, engineRef }) {
  const countdownTimerRef = useRef(null)
  const roundEndTimerRef = useRef(null)
  const promotedRef = useRef(false)
  const roundEndedRef = useRef(null)

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

  // ── COUNTDOWN → PLAYING ───────────────────────────────
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.COUNTDOWN) return

    countdownTimerRef.current = setTimeout(() => {
      beginPlaying(roomCode).catch(console.error)
    }, COUNTDOWN_DURATION * 1000)

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [isHost, game?.state, game?.round, roomCode])

  // ── Detect round end from engine ──────────────────────
  useEffect(() => {
    if (!isHost || !game || !engineRef?.current) return
    if (game.state !== GAME_STATES.PLAYING) return

    const engine = engineRef.current
    const checkInterval = setInterval(() => {
      if (!engine.running && roundEndedRef.current !== game.round) {
        roundEndedRef.current = game.round

        // Gather kill map from engine deaths
        const killMap = {}
        for (const death of engine.deaths) {
          killMap[death.uid] = { killedBy: death.killedBy, tick: death.tick }
        }

        const winnerUid = engine.getWinner()
        endRound(roomCode, game, players, winnerUid, killMap).catch(console.error)

        clearInterval(checkInterval)
      }
    }, 100)

    return () => clearInterval(checkInterval)
  }, [isHost, game?.state, game?.round, roomCode, players, engineRef])

  // ── ROUND_END → next round or GAME_OVER ───────────────
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.ROUND_END) return

    roundEndTimerRef.current = setTimeout(() => {
      advanceRound(roomCode, game, playerOrder).catch(console.error)
    }, ROUND_END_DELAY)

    return () => {
      if (roundEndTimerRef.current) clearTimeout(roundEndTimerRef.current)
    }
  }, [isHost, game?.state, game?.round, roomCode, playerOrder])

  // ── Round timer expiry ────────────────────────────────
  const serverTimeOffset = useServerTimeOffset()
  useEffect(() => {
    if (!isHost || !game) return
    if (game.state !== GAME_STATES.PLAYING || !game.roundStartTime) return

    const roundDuration = meta.roundDuration || 90
    const serverNow = Date.now() + (serverTimeOffset || 0)
    const elapsed = (serverNow - game.roundStartTime) / 1000
    const remaining = roundDuration - elapsed

    if (remaining <= 0) {
      // Time's up — end round immediately
      if (roundEndedRef.current !== game.round && engineRef?.current) {
        roundEndedRef.current = game.round
        const engine = engineRef.current
        engine.running = false
        const killMap = {}
        for (const death of engine.deaths) {
          killMap[death.uid] = { killedBy: death.killedBy, tick: death.tick }
        }
        const winnerUid = engine.getWinner()
        endRound(roomCode, game, players, winnerUid, killMap).catch(console.error)
      }
      return
    }

    const timeout = setTimeout(() => {
      if (roundEndedRef.current !== game.round && engineRef?.current) {
        roundEndedRef.current = game.round
        const engine = engineRef.current
        engine.running = false
        const killMap = {}
        for (const death of engine.deaths) {
          killMap[death.uid] = { killedBy: death.killedBy, tick: death.tick }
        }
        const winnerUid = engine.getWinner()
        endRound(roomCode, game, players, winnerUid, killMap).catch(console.error)
      }
    }, remaining * 1000)

    return () => clearTimeout(timeout)
  }, [isHost, game?.state, game?.round, game?.roundStartTime, roomCode, serverTimeOffset, meta, players, engineRef])
}

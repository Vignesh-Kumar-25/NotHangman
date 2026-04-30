import { PIPE_MOVEMENT, WORLD } from '../constants/gameConfig'

const SPEED_PROFILES = {
  cruise: { start: 0.9, max: 1.5, rampSeconds: 120 },
  normal: { start: 1, max: 2, rampSeconds: 84 },
  fast: { start: 1.5, max: 2.5, rampSeconds: 60 },
}

function seededRandom(seed) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

function pipeRandom(seed, index) {
  const random = seededRandom((seed || 1) + index * 9973)
  return random()
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function getPipe(seed, index) {
  const minTop = 56
  const maxTop = WORLD.height - WORLD.groundHeight - 196
  const pathWave = Math.sin(index * 1.78 + (seed || 1) * 0.000003)
  const variation = pipeRandom(seed, index) - 0.5
  const pathPosition = clamp(0.5 + pathWave * 0.42 + variation * 0.24, 0, 1)

  return {
    id: index,
    x: WORLD.width + 190 + index * WORLD.pipeSpacing,
    topHeight: Math.round(minTop + pathPosition * (maxTop - minTop)),
  }
}

export function getVisiblePipes(seed, elapsedMs, speedMultiplier = 1) {
  const distance = getTravelDistance(elapsedMs, speedMultiplier)
  const firstIndex = Math.max(0, Math.floor((distance - WORLD.width - 260) / WORLD.pipeSpacing))
  return Array.from({ length: 9 }, (_, offset) => getPipe(seed, firstIndex + offset))
}

export function getSpeedRamp(elapsedMs) {
  return getEffectiveSpeedMultiplier(elapsedMs)
}

function getSpeedProfile(speedMultiplier = 1) {
  if (speedMultiplier >= 1.15) return SPEED_PROFILES.fast
  if (speedMultiplier <= 0.9) return SPEED_PROFILES.cruise
  return SPEED_PROFILES.normal
}

export function getEffectiveSpeedMultiplier(elapsedMs, speedMultiplier = 1) {
  const profile = getSpeedProfile(speedMultiplier)
  const progress = Math.min(1, elapsedMs / (profile.rampSeconds * 1000))
  return profile.start + (profile.max - profile.start) * progress
}

export function getTravelDistance(elapsedMs, speedMultiplier = 1) {
  const profile = getSpeedProfile(speedMultiplier)
  const seconds = elapsedMs / 1000
  const rampSeconds = Math.min(seconds, profile.rampSeconds)
  const rampDistance = WORLD.baseSpeed * (
    profile.start * rampSeconds +
    ((profile.max - profile.start) * rampSeconds * rampSeconds) / (2 * profile.rampSeconds)
  )
  const extraSeconds = Math.max(0, seconds - profile.rampSeconds)
  return rampDistance + WORLD.baseSpeed * profile.max * extraSeconds
}

export function getPipeScreenX(pipe, elapsedMs, speedMultiplier = 1) {
  return pipe.x - getTravelDistance(elapsedMs, speedMultiplier)
}

export function getScoreFromElapsed(seed, elapsedMs, speedMultiplier = 1) {
  const distance = getTravelDistance(elapsedMs, speedMultiplier)
  const crossedDistance = distance + WORLD.birdX - WORLD.pipeWidth - WORLD.width - 190
  return Math.max(0, Math.floor(crossedDistance / WORLD.pipeSpacing) + 1)
}

export function getPipeColumnOffset(pipe, elapsedMs, score = 0, pipeGap = 150) {
  if (score < PIPE_MOVEMENT.startsAtScore) return 0

  const phase = elapsedMs / PIPE_MOVEMENT.periodMs + pipe.id * 0.72
  const minTop = 54
  const maxTop = WORLD.height - WORLD.groundHeight - pipeGap - 54
  const offset = Math.sin(phase * Math.PI * 2) * PIPE_MOVEMENT.amplitude
  return Math.max(minTop - pipe.topHeight, Math.min(maxTop - pipe.topHeight, offset))
}

export function getPipeGapTop(pipe, elapsedMs, score = 0, pipeGap = 150) {
  return pipe.topHeight + getPipeColumnOffset(pipe, elapsedMs, score, pipeGap)
}

export function hasCollision(y, seed, elapsedMs, pipeGap, speedMultiplier = 1, score = 0) {
  const half = WORLD.birdSize / 2
  const top = y - half
  const bottom = y + half

  if (top <= 0 || bottom >= WORLD.height - WORLD.groundHeight) return true

  const pipes = getVisiblePipes(seed, elapsedMs, speedMultiplier)
  return pipes.some((pipe) => {
    const x = getPipeScreenX(pipe, elapsedMs, speedMultiplier)
    const overlapsX = WORLD.birdX + half > x && WORLD.birdX - half < x + WORLD.pipeWidth
    if (!overlapsX) return false

    const gapTop = getPipeGapTop(pipe, elapsedMs, score, pipeGap)
    const gapBottom = gapTop + pipeGap
    return top < gapTop || bottom > gapBottom
  })
}

export function sortRuns(playerOrder, players, runs) {
  return [...playerOrder]
    .filter((id) => players[id])
    .sort((a, b) => {
      const runA = runs[a] || {}
      const runB = runs[b] || {}
      const scoreDiff = (runB.score || 0) - (runA.score || 0)
      if (scoreDiff !== 0) return scoreDiff
      return (runB.survivalMs || 0) - (runA.survivalMs || 0)
    })
}

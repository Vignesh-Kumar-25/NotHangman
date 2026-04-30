import { WORLD } from '../../constants/gameConfig'
import { getPipeColumnOffset, getPipeScreenX, getVisiblePipes } from '../../utils/flappyLogic'
import styles from './Board.module.css'

const COLORS = ['#fbbf24', '#22c55e', '#06b6d4', '#ec4899', '#a78bfa', '#fb7185']
const PIPE_COLORS = [
  { base: '#22c55e', light: '#86efac', dark: '#15803d', border: '#14532d' },
  { base: '#facc15', light: '#fef08a', dark: '#ca8a04', border: '#854d0e' },
  { base: '#ef4444', light: '#fca5a5', dark: '#b91c1c', border: '#7f1d1d' },
  { base: '#3b82f6', light: '#93c5fd', dark: '#1d4ed8', border: '#1e3a8a' },
]

export default function Board({
  player,
  run,
  elapsedMs,
  seed,
  pipeGap,
  speed,
  isMe,
  isWaiting,
  countdown,
  onFlap,
  colorIndex,
  flapPulse,
}) {
  const y = run?.y ?? WORLD.height / 2
  const score = run?.score ?? 0
  const alive = run?.alive !== false
  const color = COLORS[colorIndex % COLORS.length]
  const pipeColor = PIPE_COLORS[colorIndex % PIPE_COLORS.length]
  const pipes = getVisiblePipes(seed, elapsedMs, speed)

  return (
    <button
      type="button"
      className={`${styles.course} ${isMe ? styles.myCourse : ''} ${!alive ? styles.crashed : ''}`}
      onClick={onFlap}
      disabled={!isMe}
      aria-label={isMe ? 'Flap' : `${player.username} course`}
    >
      <div className={styles.skyline} />
      <div className={styles.clouds} aria-hidden="true">
        <span />
        <span />
      </div>
      <div className={styles.hills} aria-hidden="true" />
      {pipes.slice(0, 12).map((pipe) => {
        const x = getPipeScreenX(pipe, elapsedMs, speed)
        if (x < -WORLD.pipeWidth || x > WORLD.width + 40) return null
        const columnOffset = getPipeColumnOffset(pipe, elapsedMs, score, pipeGap)
        const gapTop = pipe.topHeight + columnOffset
        const pipeStyle = {
          '--pipe-base': pipeColor.base,
          '--pipe-light': pipeColor.light,
          '--pipe-dark': pipeColor.dark,
          '--pipe-border': pipeColor.border,
          left: `${(x / WORLD.width) * 100}%`,
        }
        return (
          <div key={pipe.id}>
            <div
              className={`${styles.pipe} ${styles.pipeTop}`}
              style={{
                ...pipeStyle,
                top: 0,
                height: `${(gapTop / WORLD.height) * 100}%`,
              }}
            />
            <div
              className={`${styles.pipe} ${styles.pipeBottom}`}
              style={{
                ...pipeStyle,
                top: `${((gapTop + pipeGap) / WORLD.height) * 100}%`,
                height: `${((WORLD.height - WORLD.groundHeight - gapTop - pipeGap) / WORLD.height) * 100}%`,
              }}
            />
          </div>
        )
      })}

      <div className={styles.ground} />
      <div className={styles.groundMotion} />
      <div
        className={`${styles.bird} ${flapPulse ? styles.birdFlap : ''}`}
        key={`bird-${flapPulse || 0}`}
        style={{
          top: `${(y / WORLD.height) * 100}%`,
          background: color,
          transform: `translate(-50%, -50%) rotate(${Math.max(-24, Math.min(34, (run?.velocity || 0) / 18))}deg)`,
        }}
      >
        <i className={styles.wing} />
        <span />
      </div>

      <div className={styles.hud}>
        <span className={styles.name}>{player.username}{isMe ? ' (you)' : ''}</span>
        <span className={styles.score}>{score}</span>
      </div>

      {isWaiting && (
        <div className={styles.overlay}>
          <span className={styles.countdown}>{countdown}</span>
        </div>
      )}
      {!alive && (
        <div className={styles.crashLabel}>
          <span>Crashed</span>
          <strong>{score} pipes</strong>
        </div>
      )}
    </button>
  )
}

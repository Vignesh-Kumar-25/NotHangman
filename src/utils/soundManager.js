// soundManager.js — Web Audio API sound effects & background music
// No audio files needed; all sounds are generated programmatically.

let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(freq, duration, type = 'sine', vol = 0.3, delay = 0) {
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = type
  osc.frequency.value = freq
  const t = ac.currentTime + delay
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

// ── Sound effects ──────────────────────────────────────────────

export function playCorrect() {
  // Rising chime: C5 → E5 → G5
  playTone(523.25, 0.18, 'sine', 0.28, 0.0)
  playTone(659.25, 0.18, 'sine', 0.28, 0.1)
  playTone(783.99, 0.28, 'sine', 0.28, 0.2)
}

export function playWrong() {
  // Short descending buzz
  playTone(250, 0.12, 'sawtooth', 0.22, 0.0)
  playTone(180, 0.22, 'sawtooth', 0.20, 0.11)
}

export function playRoundWin() {
  // Cheerful fanfare: C5 E5 G5 C6
  playTone(523.25, 0.15, 'triangle', 0.3, 0.0)
  playTone(659.25, 0.15, 'triangle', 0.3, 0.12)
  playTone(783.99, 0.15, 'triangle', 0.3, 0.24)
  playTone(1046.5, 0.35, 'triangle', 0.3, 0.36)
}

export function playGameOver() {
  // Happy groovy celebration: G4 B4 D5 G5 — B5 G5 D5 — G5 (major arpeggio flourish)
  playTone(392.0, 0.15, 'triangle', 0.3, 0.0)   // G4
  playTone(493.9, 0.15, 'triangle', 0.3, 0.12)  // B4
  playTone(587.3, 0.15, 'triangle', 0.3, 0.24)  // D5
  playTone(784.0, 0.2,  'triangle', 0.3, 0.36)  // G5
  playTone(987.8, 0.15, 'sine',     0.25, 0.52) // B5
  playTone(784.0, 0.15, 'sine',     0.25, 0.64) // G5
  playTone(587.3, 0.12, 'sine',     0.2, 0.76)  // D5
  playTone(784.0, 0.5,  'triangle', 0.3, 0.88)  // G5 (long resolve)
  // Bass notes underneath
  playTone(196.0, 0.3, 'sine', 0.18, 0.0)   // G3
  playTone(246.9, 0.3, 'sine', 0.18, 0.36)  // B3
  playTone(196.0, 0.6, 'sine', 0.18, 0.72)  // G3
}

// ── Background music ───────────────────────────────────────────
// Groovy loop using G pentatonic scale at 112 BPM

const BPM = 112
const BEAT = 60 / BPM  // seconds per beat

// Melody pattern (G3 pentatonic — two 8-beat bars)
const MELODY_NOTES = [
  [392.0, 1], [440.0, 1], [493.9, 1], [587.3, 1],
  [659.3, 2],             [587.3, 1], [493.9, 1],
  [392.0, 1], [392.0, 1], [440.0, 2],             [493.9, 1],
  [587.3, 1], [659.3, 1], [587.3, 1], [493.9, 2],
]

// Bass line (G2 / D3 alternating)
const BASS_NOTES = [
  [196.0, 2], [220.0, 2], [196.0, 2], [220.0, 2],
  [196.0, 2], [220.0, 2], [196.0, 2], [220.0, 2],
]

let bgRunning = false
let bgTimeout = null
let bgGain = null

function scheduleBgBar(startTime) {
  if (!bgRunning) return
  const ac = getCtx()
  if (!bgGain) {
    bgGain = ac.createGain()
    bgGain.gain.value = 0.055
    bgGain.connect(ac.destination)
  }

  // Schedule melody
  let mt = startTime
  for (const [freq, beats] of MELODY_NOTES) {
    const dur = beats * BEAT
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(bgGain)
    osc.type = 'triangle'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, mt)
    env.gain.linearRampToValueAtTime(1, mt + 0.03)
    env.gain.linearRampToValueAtTime(0, mt + dur * 0.75)
    osc.start(mt)
    osc.stop(mt + dur)
    mt += dur
  }

  // Schedule bass
  let bt = startTime
  for (const [freq, beats] of BASS_NOTES) {
    const dur = beats * BEAT
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(bgGain)
    osc.type = 'sine'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, bt)
    env.gain.linearRampToValueAtTime(0.7, bt + 0.04)
    env.gain.linearRampToValueAtTime(0, bt + dur * 0.55)
    osc.start(bt)
    osc.stop(bt + dur)
    bt += dur
  }

  const totalBeats = MELODY_NOTES.reduce((s, [, b]) => s + b, 0)
  const barDuration = totalBeats * BEAT
  const msUntilNext = (barDuration - 0.15) * 1000

  bgTimeout = setTimeout(() => {
    if (bgRunning) scheduleBgBar(ac.currentTime + 0.1)
  }, msUntilNext)
}

export function startBgMusic() {
  if (bgRunning) return
  bgRunning = true
  const ac = getCtx()
  scheduleBgBar(ac.currentTime + 0.05)
}

export function stopBgMusic() {
  bgRunning = false
  clearTimeout(bgTimeout)
  bgTimeout = null
  if (bgGain) {
    const ac = getCtx()
    bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime)
    bgGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3)
    bgGain = null
  }
}

export function isBgMusicPlaying() {
  return bgRunning
}

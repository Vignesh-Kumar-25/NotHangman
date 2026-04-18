let ctx = null
let muted = false

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(freq, duration, type = 'sine', vol = 0.3, delay = 0) {
  if (muted) return
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

// ── Sound effects ─────────────────────────────────────────

export function playTileReveal() {
  playTone(800, 0.06, 'square', 0.12)
  playTone(1200, 0.04, 'sine', 0.08, 0.03)
}

export function playButtonClick() {
  playTone(660, 0.035, 'square', 0.09)
  playTone(880, 0.025, 'sine', 0.06, 0.02)
}

export function playExplosion() {
  if (muted) return
  const ac = getCtx()
  const t = ac.currentTime

  // Low boom
  const boom = ac.createOscillator()
  const boomG = ac.createGain()
  boom.connect(boomG)
  boomG.connect(ac.destination)
  boom.type = 'sine'
  boom.frequency.setValueAtTime(120, t)
  boom.frequency.exponentialRampToValueAtTime(30, t + 0.8)
  boomG.gain.setValueAtTime(0.45, t)
  boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
  boom.start(t)
  boom.stop(t + 0.9)

  // Mid rumble
  const rumble = ac.createOscillator()
  const rumbleG = ac.createGain()
  rumble.connect(rumbleG)
  rumbleG.connect(ac.destination)
  rumble.type = 'sawtooth'
  rumble.frequency.setValueAtTime(80, t)
  rumble.frequency.exponentialRampToValueAtTime(20, t + 0.6)
  rumbleG.gain.setValueAtTime(0.18, t)
  rumbleG.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  rumble.start(t)
  rumble.stop(t + 0.7)

  // Noise burst
  const bufLen = ac.sampleRate * 0.5
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.08))
  }
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const noiseG = ac.createGain()
  noise.connect(noiseG)
  noiseG.connect(ac.destination)
  noiseG.gain.setValueAtTime(0.28, t)
  noiseG.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
  noise.start(t)
  noise.stop(t + 0.5)

  // High crackle
  const crackle = ac.createOscillator()
  const crackleG = ac.createGain()
  crackle.connect(crackleG)
  crackleG.connect(ac.destination)
  crackle.type = 'square'
  crackle.frequency.setValueAtTime(2000, t)
  crackle.frequency.exponentialRampToValueAtTime(200, t + 0.3)
  crackleG.gain.setValueAtTime(0.12, t)
  crackleG.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  crackle.start(t)
  crackle.stop(t + 0.35)
}

export function playRoundWin() {
  playTone(523.25, 0.15, 'triangle', 0.28, 0.0)
  playTone(659.25, 0.15, 'triangle', 0.28, 0.12)
  playTone(783.99, 0.15, 'triangle', 0.28, 0.24)
  playTone(1046.5, 0.35, 'triangle', 0.28, 0.36)
}

export function playMatchWin() {
  playTone(392.0, 0.12, 'triangle', 0.28, 0.0)
  playTone(493.9, 0.12, 'triangle', 0.28, 0.1)
  playTone(587.3, 0.12, 'triangle', 0.28, 0.2)
  playTone(784.0, 0.18, 'triangle', 0.28, 0.3)
  playTone(987.8, 0.12, 'sine', 0.22, 0.45)
  playTone(784.0, 0.12, 'sine', 0.22, 0.55)
  playTone(587.3, 0.1, 'sine', 0.18, 0.65)
  playTone(784.0, 0.5, 'triangle', 0.28, 0.75)
  playTone(196.0, 0.3, 'sine', 0.16, 0.0)
  playTone(246.9, 0.3, 'sine', 0.16, 0.3)
  playTone(196.0, 0.5, 'sine', 0.16, 0.6)
}

// ── Background music ──────────────────────────────────────
// Intense driving loop in E minor at 150 BPM

const BPM = 150
const EIGHTH = 60 / BPM / 2

const MELODY = [
  [329.63, 1], [392.00, 1], [493.88, 1], [659.25, 1],
  [493.88, 1], [392.00, 1], [329.63, 1], [246.94, 1],
  [220.00, 1], [261.63, 1], [329.63, 1], [440.00, 1],
  [329.63, 1], [261.63, 1], [220.00, 1], [329.63, 1],
  [329.63, 1], [440.00, 1], [493.88, 1], [523.25, 1],
  [493.88, 1], [440.00, 1], [392.00, 1], [329.63, 1],
  [493.88, 1], [440.00, 1], [392.00, 1], [329.63, 1],
  [293.66, 1], [329.63, 1], [392.00, 1], [329.63, 1],
]

const BASS = [
  [82.41, 2], [82.41, 2], [82.41, 2], [82.41, 2],
  [110.00, 2], [110.00, 2], [110.00, 2], [110.00, 2],
  [82.41, 2], [82.41, 2], [98.00, 2], [98.00, 2],
  [123.47, 2], [123.47, 2], [82.41, 2], [82.41, 2],
]

let bgDesired = false
let bgActive = false
let bgTimeout = null
let bgGain = null

function scheduleBgBar(startTime) {
  if (!bgActive || muted) return
  const ac = getCtx()
  if (!bgGain) {
    bgGain = ac.createGain()
    bgGain.gain.value = 0.055
    bgGain.connect(ac.destination)
  }

  let mt = startTime
  for (const [freq, eighths] of MELODY) {
    const dur = eighths * EIGHTH
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(bgGain)
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, mt)
    env.gain.linearRampToValueAtTime(0.6, mt + 0.015)
    env.gain.linearRampToValueAtTime(0, mt + dur * 0.65)
    osc.start(mt)
    osc.stop(mt + dur)
    mt += dur
  }

  let bt = startTime
  for (const [freq, eighths] of BASS) {
    const dur = eighths * EIGHTH
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(bgGain)
    osc.type = 'sine'
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, bt)
    env.gain.linearRampToValueAtTime(0.85, bt + 0.02)
    env.gain.linearRampToValueAtTime(0, bt + dur * 0.45)
    osc.start(bt)
    osc.stop(bt + dur)
    bt += dur
  }

  // Percussive clicks on offbeats
  for (let i = 0; i < 32; i += 2) {
    const pt = startTime + (i + 1) * EIGHTH
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(bgGain)
    osc.type = 'square'
    osc.frequency.value = 1800 + Math.random() * 400
    env.gain.setValueAtTime(0, pt)
    env.gain.linearRampToValueAtTime(0.25, pt + 0.004)
    env.gain.linearRampToValueAtTime(0, pt + 0.025)
    osc.start(pt)
    osc.stop(pt + 0.03)
  }

  const totalEighths = MELODY.reduce((s, [, e]) => s + e, 0)
  const barDur = totalEighths * EIGHTH
  const msNext = (barDur - 0.1) * 1000

  bgTimeout = setTimeout(() => {
    if (bgActive && !muted) scheduleBgBar(ac.currentTime + 0.05)
  }, msNext)
}

export function startBgMusic() {
  bgDesired = true
  if (bgActive || muted) return
  bgActive = true
  const ac = getCtx()
  scheduleBgBar(ac.currentTime + 0.05)
}

export function stopBgMusic() {
  bgDesired = false
  bgActive = false
  clearTimeout(bgTimeout)
  bgTimeout = null
  if (bgGain) {
    try {
      const ac = getCtx()
      bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime)
      bgGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3)
    } catch { /* ignore */ }
    bgGain = null
  }
}

export function setMuted(val) {
  muted = val
  if (muted && bgActive) {
    bgActive = false
    clearTimeout(bgTimeout)
    bgTimeout = null
    if (bgGain) {
      try {
        const ac = getCtx()
        bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime)
        bgGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.2)
      } catch { /* ignore */ }
      bgGain = null
    }
  } else if (!muted && bgDesired && !bgActive) {
    bgActive = true
    bgGain = null
    const ac = getCtx()
    scheduleBgBar(ac.currentTime + 0.05)
  }
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  setMuted(!muted)
  return muted
}

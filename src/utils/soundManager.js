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
// Funky upbeat groove in C major at 124 BPM with progressive beat drop

const BPM = 124
const BEAT = 60 / BPM
const EIGHTH = BEAT / 2
const SIXTEENTH = EIGHTH / 2

// Buildup: bouncy staccato melody (C major pentatonic)
const BUILD_MELODY = [
  [523.25, 0.5], [587.33, 0.5], [659.25, 1], [587.33, 0.5], [523.25, 0.5],
  [493.88, 1], [523.25, 0.5], [587.33, 0.5], [659.25, 1], [783.99, 1],
  [659.25, 0.5], [587.33, 0.5], [523.25, 1], [493.88, 0.5], [440.00, 0.5],
  [493.88, 1], [523.25, 1], [587.33, 0.5], [523.25, 0.5], [493.88, 1],
]

const BUILD_BASS = [
  [130.81, 2], [146.83, 2], [164.81, 2], [146.83, 2],
  [130.81, 2], [110.00, 2], [123.47, 2], [130.81, 2],
]

// Drop: high-energy syncopated melody
const DROP_MELODY = [
  [783.99, 0.5], [880.00, 0.5], [1046.5, 1], [880.00, 0.5], [783.99, 0.5],
  [659.25, 1], [783.99, 0.5], [880.00, 0.5], [783.99, 1], [659.25, 1],
  [783.99, 0.5], [659.25, 0.5], [587.33, 1], [523.25, 0.5], [587.33, 0.5],
  [659.25, 1], [783.99, 1], [880.00, 0.5], [783.99, 0.5], [659.25, 1],
]

// Drop: punchy syncopated sub-bass
const DROP_BASS = [
  [65.41, 1], [65.41, 0.5], [73.42, 0.5], [65.41, 1], [82.41, 1],
  [65.41, 1], [65.41, 0.5], [87.31, 0.5], [82.41, 1], [73.42, 1],
  [65.41, 1], [73.42, 1], [82.41, 0.5], [65.41, 0.5], [73.42, 1],
  [65.41, 1.5], [82.41, 0.5], [65.41, 1], [73.42, 1],
]

// Funky chord stabs for the drop (C, Am, F, G)
const CHORD_STABS = [
  [[523.25, 659.25, 783.99], 2],
  [[440.00, 523.25, 659.25], 2],
  [[349.23, 440.00, 523.25], 2],
  [[392.00, 493.88, 587.33], 2],
  [[523.25, 659.25, 783.99], 2],
  [[440.00, 523.25, 659.25], 2],
  [[349.23, 440.00, 523.25], 2],
  [[392.00, 493.88, 587.33], 2],
]

const BUILD_BARS = 3
const DROP_BARS = 5
const TOTAL_CYCLE = BUILD_BARS + DROP_BARS

let bgRunning = false
let bgTimeout = null
let bgGain = null
let bgBarCount = 0

function scheduleKick(ac, gainNode, time, vol) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.connect(env)
  env.connect(gainNode)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, time)
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.08)
  env.gain.setValueAtTime(0, time)
  env.gain.linearRampToValueAtTime(vol, time + 0.004)
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.14)
  osc.start(time)
  osc.stop(time + 0.15)
}

function scheduleClap(ac, gainNode, time, vol) {
  const bufLen = Math.floor(ac.sampleRate * 0.05)
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.012))
  }
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const env = ac.createGain()
  const filt = ac.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.value = 1500
  filt.Q.value = 1.5
  noise.connect(filt)
  filt.connect(env)
  env.connect(gainNode)
  env.gain.setValueAtTime(vol, time)
  env.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
  noise.start(time)
  noise.stop(time + 0.07)
}

function scheduleHiHat(ac, gainNode, time, vol, open) {
  const bufLen = Math.floor(ac.sampleRate * (open ? 0.08 : 0.025))
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
  const data = buf.getChannelData(0)
  const decay = open ? 0.03 : 0.008
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * decay))
  }
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const env = ac.createGain()
  const filt = ac.createBiquadFilter()
  filt.type = 'highpass'
  filt.frequency.value = 7000
  noise.connect(filt)
  filt.connect(env)
  env.connect(gainNode)
  env.gain.setValueAtTime(vol, time)
  env.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.09 : 0.03))
  noise.start(time)
  noise.stop(time + (open ? 0.1 : 0.04))
}

function scheduleBgBar(startTime) {
  if (!bgRunning) return
  const ac = getCtx()
  if (!bgGain) {
    bgGain = ac.createGain()
    bgGain.gain.value = 0.055
    bgGain.connect(ac.destination)
  }

  const phase = bgBarCount % TOTAL_CYCLE
  const isDropped = phase >= BUILD_BARS
  const buildProgress = isDropped ? 1 : phase / BUILD_BARS

  if (isDropped) {
    // Drop melody — square wave lead with triangle octave shimmer
    let mt = startTime
    for (const [freq, beats] of DROP_MELODY) {
      const dur = beats * BEAT
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.connect(env)
      env.connect(bgGain)
      osc.type = 'square'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0, mt)
      env.gain.linearRampToValueAtTime(0.6, mt + 0.008)
      env.gain.linearRampToValueAtTime(0.3, mt + dur * 0.4)
      env.gain.linearRampToValueAtTime(0, mt + dur * 0.8)
      osc.start(mt)
      osc.stop(mt + dur)

      const shim = ac.createOscillator()
      const shimEnv = ac.createGain()
      shim.connect(shimEnv)
      shimEnv.connect(bgGain)
      shim.type = 'triangle'
      shim.frequency.value = freq * 2
      shimEnv.gain.setValueAtTime(0, mt)
      shimEnv.gain.linearRampToValueAtTime(0.18, mt + 0.01)
      shimEnv.gain.linearRampToValueAtTime(0, mt + dur * 0.45)
      shim.start(mt)
      shim.stop(mt + dur)
      mt += dur
    }

    // Drop sub-bass — sawtooth + sine sub
    let bt = startTime
    for (const [freq, beats] of DROP_BASS) {
      const dur = beats * BEAT
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.connect(env)
      env.connect(bgGain)
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0, bt)
      env.gain.linearRampToValueAtTime(1.0, bt + 0.01)
      env.gain.linearRampToValueAtTime(0.4, bt + dur * 0.3)
      env.gain.linearRampToValueAtTime(0, bt + dur * 0.85)
      osc.start(bt)
      osc.stop(bt + dur)

      const sub = ac.createOscillator()
      const subEnv = ac.createGain()
      sub.connect(subEnv)
      subEnv.connect(bgGain)
      sub.type = 'sine'
      sub.frequency.value = freq
      subEnv.gain.setValueAtTime(0, bt)
      subEnv.gain.linearRampToValueAtTime(1.2, bt + 0.01)
      subEnv.gain.exponentialRampToValueAtTime(0.001, bt + dur * 0.9)
      sub.start(bt)
      sub.stop(bt + dur)
      bt += dur
    }

    // Chord stabs — funky offbeat hits
    let ct = startTime
    for (const [freqs, beats] of CHORD_STABS) {
      const dur = beats * BEAT
      const stabTime = ct + EIGHTH
      for (const f of freqs) {
        const osc = ac.createOscillator()
        const env = ac.createGain()
        osc.connect(env)
        env.connect(bgGain)
        osc.type = 'triangle'
        osc.frequency.value = f
        env.gain.setValueAtTime(0, stabTime)
        env.gain.linearRampToValueAtTime(0.22, stabTime + 0.008)
        env.gain.linearRampToValueAtTime(0, stabTime + EIGHTH * 0.7)
        osc.start(stabTime)
        osc.stop(stabTime + EIGHTH)
      }
      ct += dur
    }

    // Full drum kit
    const totalBeats = DROP_MELODY.reduce((s, [, b]) => s + b, 0)
    const beatsInt = Math.floor(totalBeats)
    for (let i = 0; i < beatsInt; i++) {
      scheduleKick(ac, bgGain, startTime + i * BEAT, 0.8)
      if (i % 2 === 1) {
        scheduleClap(ac, bgGain, startTime + i * BEAT, 0.45)
      }
    }

    // Hi-hats: every eighth, open on offbeats
    const eighthCount = Math.floor(totalBeats * 2)
    for (let i = 0; i < eighthCount; i++) {
      const ht = startTime + i * EIGHTH
      const isOpen = i % 4 === 3
      scheduleHiHat(ac, bgGain, ht, isOpen ? 0.2 : 0.14, isOpen)
    }
  } else {
    // Buildup melody — gets louder each bar
    const melodyVol = 0.35 + buildProgress * 0.35
    let mt = startTime
    for (const [freq, beats] of BUILD_MELODY) {
      const dur = beats * BEAT
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.connect(env)
      env.connect(bgGain)
      osc.type = 'triangle'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0, mt)
      env.gain.linearRampToValueAtTime(melodyVol, mt + 0.02)
      env.gain.linearRampToValueAtTime(0, mt + dur * 0.7)
      osc.start(mt)
      osc.stop(mt + dur)
      mt += dur
    }

    // Buildup bass — volume ramps up
    const bassVol = 0.3 + buildProgress * 0.4
    let bt = startTime
    for (const [freq, beats] of BUILD_BASS) {
      const dur = beats * BEAT
      const osc = ac.createOscillator()
      const env = ac.createGain()
      osc.connect(env)
      env.connect(bgGain)
      osc.type = 'sine'
      osc.frequency.value = freq
      env.gain.setValueAtTime(0, bt)
      env.gain.linearRampToValueAtTime(bassVol, bt + 0.03)
      env.gain.linearRampToValueAtTime(0, bt + dur * 0.5)
      osc.start(bt)
      osc.stop(bt + dur)
      bt += dur
    }

    // Kicks fade in from bar 2
    if (buildProgress > 0.3) {
      const totalBeats = BUILD_MELODY.reduce((s, [, b]) => s + b, 0)
      const beatsInt = Math.floor(totalBeats)
      for (let i = 0; i < beatsInt; i += 2) {
        scheduleKick(ac, bgGain, startTime + i * BEAT, 0.25 + buildProgress * 0.3)
      }
    }

    // Hi-hats get busier each bar
    const totalBeats = BUILD_MELODY.reduce((s, [, b]) => s + b, 0)
    const eighthCount = Math.floor(totalBeats * 2)
    const step = phase === 0 ? 4 : phase === 1 ? 2 : 1
    for (let i = 0; i < eighthCount; i += step) {
      const ht = startTime + i * EIGHTH
      scheduleHiHat(ac, bgGain, ht, 0.08 + buildProgress * 0.06, false)
    }

    // Last buildup bar: snare fill (no siren)
    if (phase === BUILD_BARS - 1) {
      const barDuration = totalBeats * BEAT
      const fillStart = barDuration * 0.5
      const fillBeats = Math.floor((barDuration - fillStart) / SIXTEENTH)
      for (let i = 0; i < fillBeats; i++) {
        const ft = startTime + fillStart + i * SIXTEENTH
        if (ft >= startTime + barDuration) break
        scheduleClap(ac, bgGain, ft, 0.12 + i * 0.008)
      }
      // Kick build: quarter notes accelerating to eighths in last 2 beats
      for (let i = 0; i < 4; i++) {
        scheduleKick(ac, bgGain, startTime + barDuration - (4 - i) * EIGHTH, 0.5 + i * 0.1)
      }
    }
  }

  const melodyBeats = (isDropped ? DROP_MELODY : BUILD_MELODY).reduce((s, [, b]) => s + b, 0)
  const barDuration = melodyBeats * BEAT
  const msUntilNext = (barDuration - 0.15) * 1000

  bgBarCount++
  bgTimeout = setTimeout(() => {
    if (bgRunning) scheduleBgBar(ac.currentTime + 0.1)
  }, msUntilNext)
}

export function startBgMusic() {
  if (bgRunning) return
  bgRunning = true
  bgBarCount = 0
  const ac = getCtx()
  scheduleBgBar(ac.currentTime + 0.05)
}

export function stopBgMusic() {
  bgRunning = false
  clearTimeout(bgTimeout)
  bgTimeout = null
  bgBarCount = 0
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

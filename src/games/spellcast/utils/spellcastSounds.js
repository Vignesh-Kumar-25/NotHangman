let ctx = null
let muted = false
let bgDesired = false
let bgActive = false
let bgTimeout = null
let bgGain = null
let bgStep = 0

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(freq, duration, type = 'sine', vol = 0.2, delay = 0) {
  if (muted) return
  const ac = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.type = type
  const t = ac.currentTime + delay
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.04)
}

export function playLetterSelect(length) {
  const step = Math.max(1, Math.min(length, 8))
  const freq = 360 + step * 52
  const shimmer = freq * 1.5
  playTone(freq, 0.08, 'triangle', 0.1 + step * 0.008, 0)
  playTone(shimmer, 0.05, 'sine', 0.04 + step * 0.004, 0.015)
}

export function playWordComplete(length) {
  const notes = length <= 3
    ? [523.25, 659.25]
    : length === 4
      ? [523.25, 659.25, 783.99]
      : length === 5
        ? [523.25, 659.25, 783.99, 1046.5]
        : [523.25, 659.25, 783.99, 1046.5, 1318.51]

  notes.forEach((freq, index) => {
    playTone(freq, 0.12 + index * 0.02, 'triangle', 0.18 + index * 0.02, index * 0.09)
  })

  if (length >= 5) {
    playTone(196, 0.35, 'sine', 0.12, 0)
  }

  if (length >= 6) {
    playTone(261.63, 0.45, 'sine', 0.12, 0.18)
  }
}

export function playInvalidWord() {
  playTone(240, 0.08, 'sawtooth', 0.14, 0)
  playTone(190, 0.14, 'sawtooth', 0.12, 0.07)
}

export function playGemCollect() {
  playTone(784, 0.08, 'triangle', 0.14, 0)
  playTone(987.77, 0.09, 'sine', 0.1, 0.05)
  playTone(1318.51, 0.12, 'triangle', 0.08, 0.11)
}

const BPM = 92
const BEAT = 60 / BPM
const EIGHTH = BEAT / 2
const BAR_STEPS = 16

const PAD_CHORDS = [
  [261.63, 329.63, 392.0],
  [293.66, 369.99, 440.0],
  [220.0, 293.66, 349.23],
  [246.94, 329.63, 392.0],
]

const LEAD_NOTES = [
  523.25, 587.33, 659.25, 783.99,
  659.25, 587.33, 523.25, 493.88,
  440.0, 493.88, 523.25, 659.25,
  587.33, 523.25, 493.88, 440.0,
]

const BASS_NOTES = [
  130.81, 130.81, 146.83, 146.83,
  110.0, 110.0, 123.47, 123.47,
]

function schedulePad(ac, gainNode, chord, startTime, duration) {
  chord.forEach((freq, index) => {
    const osc = ac.createOscillator()
    const env = ac.createGain()
    const filter = ac.createBiquadFilter()
    osc.connect(filter)
    filter.connect(env)
    env.connect(gainNode)
    osc.type = index === 0 ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(freq, startTime)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1400, startTime)
    env.gain.setValueAtTime(0.0001, startTime)
    env.gain.linearRampToValueAtTime(0.12, startTime + 0.35)
    env.gain.linearRampToValueAtTime(0.07, startTime + duration * 0.7)
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.08)
  })
}

function scheduleBass(ac, gainNode, freq, startTime, duration) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.connect(env)
  env.connect(gainNode)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)
  env.gain.setValueAtTime(0.0001, startTime)
  env.gain.linearRampToValueAtTime(0.2, startTime + 0.02)
  env.gain.linearRampToValueAtTime(0.11, startTime + duration * 0.5)
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.05)
}

function scheduleLead(ac, gainNode, freq, startTime) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  const vibrato = ac.createOscillator()
  const vibratoGain = ac.createGain()
  vibrato.connect(vibratoGain)
  vibratoGain.connect(osc.frequency)
  osc.connect(env)
  env.connect(gainNode)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, startTime)
  vibrato.frequency.setValueAtTime(5.5, startTime)
  vibratoGain.gain.setValueAtTime(4, startTime)
  env.gain.setValueAtTime(0.0001, startTime)
  env.gain.linearRampToValueAtTime(0.09, startTime + 0.03)
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + EIGHTH * 1.7)
  osc.start(startTime)
  vibrato.start(startTime)
  osc.stop(startTime + EIGHTH * 1.8)
  vibrato.stop(startTime + EIGHTH * 1.8)
}

function scheduleSparkle(ac, gainNode, startTime) {
  const osc = ac.createOscillator()
  const env = ac.createGain()
  osc.connect(env)
  env.connect(gainNode)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1567.98, startTime)
  env.gain.setValueAtTime(0.0001, startTime)
  env.gain.linearRampToValueAtTime(0.04, startTime + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18)
  osc.start(startTime)
  osc.stop(startTime + 0.2)
}

function scheduleBgBar(startTime) {
  if (!bgActive || muted) return
  const ac = getCtx()

  if (!bgGain) {
    bgGain = ac.createGain()
    bgGain.gain.value = 0.1
    bgGain.connect(ac.destination)
  }

  const chord = PAD_CHORDS[bgStep % PAD_CHORDS.length]
  const bass = BASS_NOTES[bgStep % BASS_NOTES.length]
  const barDuration = BAR_STEPS * EIGHTH

  schedulePad(ac, bgGain, chord, startTime, barDuration)
  scheduleBass(ac, bgGain, bass, startTime, BEAT * 2)
  scheduleBass(ac, bgGain, bass * 1.1225, startTime + BEAT * 2, BEAT * 2)

  for (let step = 0; step < BAR_STEPS; step += 2) {
    const note = LEAD_NOTES[(bgStep * 4 + step / 2) % LEAD_NOTES.length]
    const noteTime = startTime + step * EIGHTH
    scheduleLead(ac, bgGain, note, noteTime)
    if (step % 4 === 2) {
      scheduleSparkle(ac, bgGain, noteTime + 0.08)
    }
  }

  bgStep++
  bgTimeout = setTimeout(() => {
    if (bgActive && !muted) scheduleBgBar(ac.currentTime + 0.08)
  }, (barDuration - 0.12) * 1000)
}

export function startBgMusic() {
  bgDesired = true
  if (bgActive || muted) return
  bgActive = true
  bgStep = 0
  const ac = getCtx()
  scheduleBgBar(ac.currentTime + 0.05)
}

export function stopBgMusic() {
  bgDesired = false
  bgActive = false
  clearTimeout(bgTimeout)
  bgTimeout = null
  bgStep = 0
  if (bgGain) {
    try {
      const ac = getCtx()
      bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime)
      bgGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.35)
    } catch {
      // ignore
    }
    bgGain = null
  }
}

export function setMuted(value) {
  muted = value
  if (muted && bgActive) {
    bgActive = false
    clearTimeout(bgTimeout)
    bgTimeout = null
    if (bgGain) {
      try {
        const ac = getCtx()
        bgGain.gain.setValueAtTime(bgGain.gain.value, ac.currentTime)
        bgGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.2)
      } catch {
        // ignore
      }
      bgGain = null
    }
  } else if (!muted && bgDesired && !bgActive) {
    bgActive = true
    bgGain = null
    bgStep = 0
    const ac = getCtx()
    scheduleBgBar(ac.currentTime + 0.05)
  }
}

export function isMuted() {
  return muted
}

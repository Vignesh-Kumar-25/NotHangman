let audioCtx = null
let musicTimer = null
let musicStep = 0
let musicActive = false
let nextStepAt = 0
let musicPace = 1

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playFlap() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, now)
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.055)

    filter.type = 'highpass'
    filter.frequency.value = 220

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.12)
  } catch {
    // Audio can be unavailable before user activation or in restricted browsers.
  }
}

export function playPipeCross(speed = 1) {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const hype = speed >= 2 ? 1 : 0
    const base = 86 + Math.round(hype * 5)
    const volume = 0.12 + hype * 0.05

    playTone(ctx, now, base, 0.075, 'triangle', volume)
    playTone(ctx, now + 0.058, base + 4, 0.085, hype > 0.45 ? 'square' : 'triangle', volume * 0.86)
    if (hype > 0.25) {
      playTone(ctx, now + 0.118, base + 7, 0.075, 'triangle', volume * 0.72)
    }
    if (hype > 0.7) {
      playTone(ctx, now + 0.172, base + 12, 0.07, 'square', volume * 0.54)
    }
  } catch {
    // No-op when audio is unavailable.
  }
}

function midiToFreq(note) {
  return 440 * (2 ** ((note - 69) / 12))
}

function playTone(ctx, time, note, duration, type, volume, destination = ctx.destination) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(midiToFreq(note), time)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  osc.connect(gain)
  gain.connect(destination)
  osc.start(time)
  osc.stop(time + duration + 0.03)
}

function playPadTone(ctx, time, note, duration, volume) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(midiToFreq(note), time)
  filter.type = 'lowpass'
  filter.frequency.value = 1500
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.18)
  gain.gain.setValueAtTime(volume, time + duration * 0.72)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration + 0.04)
}

function playAngelPad(ctx, time, notes, duration) {
  notes.forEach((note, index) => {
    playPadTone(ctx, time + index * 0.018, note, duration, 0.0085)
  })
}

function playKick(ctx, time) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(130, time)
  osc.frequency.exponentialRampToValueAtTime(46, time + 0.13)
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.22, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.17)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.19)
}

function playClap(ctx, time) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.09)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const noise = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  noise.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = 1800
  filter.Q.value = 0.9
  gain.gain.setValueAtTime(0.0001, time)
  gain.gain.exponentialRampToValueAtTime(0.13, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(time)
}

function schedulePopStep() {
  if (!musicActive) return
  const ctx = getAudioContext()
  const pace = Math.min(1.28, Math.max(1, 1 + (musicPace - 1) * 0.28))
  const highSpeed = musicPace >= 2
  const stepDur = 60 / (126 * pace) / 2
  const lead = [76, 78, 81, 83, 81, 78, 76, 74, 76, 78, 81, 86, 83, 81, 78, 76]
  const bass = [45, 45, 52, 52, 49, 49, 57, 57]
  const subBass = [33, 33, 40, 40, 37, 37, 45, 45]
  const angelPads = [
    [69, 73, 76],
    [68, 71, 76],
    [66, 69, 73],
    [69, 73, 78],
  ]
  const time = nextStepAt
  const step = musicStep % 16

  if (step % 4 === 0) playKick(ctx, time)
  if (step === 4 || step === 12) playClap(ctx, time + 0.015)
  if (step % 2 === 0) playTone(ctx, time, bass[(musicStep / 2) % bass.length], stepDur * 0.85, 'sawtooth', 0.045)
  playTone(ctx, time, lead[step], stepDur * 0.72, step % 4 === 3 ? 'square' : 'triangle', 0.035)
  if (highSpeed && step % 8 === 0) {
    playTone(ctx, time, subBass[(musicStep / 2) % subBass.length], stepDur * 3.6, 'sine', 0.032)
    playAngelPad(ctx, time + stepDur * 0.08, angelPads[Math.floor(musicStep / 8) % angelPads.length], stepDur * 7.7)
  }
  if (step === 7 || step === 15) {
    playTone(ctx, time + stepDur * 0.42, lead[step] + 7, stepDur * 0.45, 'triangle', 0.026)
  }

  musicStep += 1
  nextStepAt += stepDur
  const delay = Math.max(25, (nextStepAt - ctx.currentTime - 0.04) * 1000)
  musicTimer = window.setTimeout(schedulePopStep, delay)
}

export function startPopMusic() {
  try {
    const ctx = getAudioContext()
    if (musicActive) return
    musicActive = true
    musicStep = 0
    nextStepAt = ctx.currentTime + 0.04
    schedulePopStep()
  } catch {
    musicActive = false
  }
}

export function setPopMusicPace(speed = 1) {
  musicPace = Math.min(2, Math.max(1, speed))
}

export function stopPopMusic() {
  musicActive = false
  musicPace = 1
  if (musicTimer) {
    window.clearTimeout(musicTimer)
    musicTimer = null
  }
}

export function playGameOverVoice() {
  try {
    stopPopMusic()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance('Game Over')
      utterance.rate = 0.72
      utterance.pitch = 0.35
      utterance.volume = 1
      const voices = window.speechSynthesis.getVoices()
      const lowerVoice = voices.find((voice) => /male|david|mark|daniel|alex|google uk english male/i.test(voice.name))
      if (lowerVoice) utterance.voice = lowerVoice
      window.speechSynthesis.speak(utterance)
      return
    }
  } catch {
    // Fall through to synthesized fallback.
  }

  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [38, 34]
    notes.forEach((note, index) => {
      const start = now + index * 0.42
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(midiToFreq(note), start)
      osc.frequency.exponentialRampToValueAtTime(midiToFreq(note - 2), start + 0.35)
      filter.type = 'lowpass'
      filter.frequency.value = 420
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.42)
    })
  } catch {
    // No-op when audio is unavailable.
  }
}

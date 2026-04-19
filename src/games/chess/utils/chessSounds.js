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

export function playPieceSelect() {
  playTone(600, 0.05, 'sine', 0.1)
}

export function playPieceMove() {
  playTone(300, 0.06, 'triangle', 0.18)
  playTone(450, 0.08, 'sine', 0.12, 0.03)
}

export function playPieceCapture() {
  if (muted) return
  const ac = getCtx()
  const t = ac.currentTime

  playTone(250, 0.08, 'sawtooth', 0.2)
  playTone(400, 0.1, 'triangle', 0.15, 0.04)

  const bufLen = Math.floor(ac.sampleRate * 0.04)
  const buf = ac.createBuffer(1, bufLen, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.01))
  }
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const noiseG = ac.createGain()
  noise.connect(noiseG)
  noiseG.connect(ac.destination)
  noiseG.gain.setValueAtTime(0.15, t + 0.02)
  noiseG.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  noise.start(t + 0.02)
  noise.stop(t + 0.1)
}

export function playCheck() {
  playTone(880, 0.1, 'square', 0.15)
  playTone(660, 0.15, 'square', 0.12, 0.08)
}

export function playCheckmate() {
  playTone(523.25, 0.2, 'triangle', 0.25, 0.0)
  playTone(659.25, 0.2, 'triangle', 0.25, 0.15)
  playTone(783.99, 0.2, 'triangle', 0.25, 0.30)
  playTone(1046.5, 0.5, 'triangle', 0.3, 0.45)
}

export function playStalemate() {
  playTone(440, 0.3, 'sine', 0.2, 0.0)
  playTone(415, 0.3, 'sine', 0.2, 0.25)
  playTone(392, 0.5, 'sine', 0.18, 0.5)
}

export function playIllegal() {
  playTone(200, 0.12, 'square', 0.1)
}

export function setMuted(val) { muted = val }
export function isMuted() { return muted }

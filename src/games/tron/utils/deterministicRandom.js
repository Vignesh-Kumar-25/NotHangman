// Mulberry32 - simple seeded PRNG
export class SeededRandom {
  constructor(seed) {
    this.state = seed | 0
  }

  next() {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  nextInt(min, max) {
    return min + Math.floor(this.next() * (max - min))
  }

  pick(array) {
    return array[this.nextInt(0, array.length)]
  }
}

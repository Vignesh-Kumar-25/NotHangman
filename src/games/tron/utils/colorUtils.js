export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 255, g: 255, b: 255 }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

export function rgbString(r, g, b, a = 1) {
  return a < 1
    ? `rgba(${r},${g},${b},${a})`
    : `rgb(${r},${g},${b})`
}

export function trailColor(hex, age, maxAge) {
  const { r, g, b } = hexToRgb(hex)
  const alpha = maxAge > 0
    ? Math.max(0.2, 1 - (age / maxAge) * 0.8)
    : 1
  return rgbString(r, g, b, alpha)
}

export function glowColor(hex, alpha = 0.4) {
  const { r, g, b } = hexToRgb(hex)
  return rgbString(r, g, b, alpha)
}

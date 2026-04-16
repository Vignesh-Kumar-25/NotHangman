export const VEHICLE_COLORS = [
  { id: 0, name: 'Cyan',          hex: '#00ffff' },
  { id: 1, name: 'Magenta',       hex: '#ff00ff' },
  { id: 2, name: 'Lime',          hex: '#39ff14' },
  { id: 3, name: 'Orange',        hex: '#ff6600' },
  { id: 4, name: 'Hot Pink',      hex: '#ff1493' },
  { id: 5, name: 'Electric Blue', hex: '#0066ff' },
  { id: 6, name: 'Gold',          hex: '#ffd700' },
  { id: 7, name: 'Red',           hex: '#ff0033' },
]

export const VEHICLE_STYLES = [
  { id: 0, name: 'Arrow' },
  { id: 1, name: 'Diamond' },
  { id: 2, name: 'Circle' },
  { id: 3, name: 'Square' },
]

export const DEFAULT_VEHICLE_COLOR = 0
export const DEFAULT_VEHICLE_STYLE = 0

export function getColorHex(colorId) {
  return VEHICLE_COLORS[colorId]?.hex ?? VEHICLE_COLORS[0].hex
}

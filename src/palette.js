const chroma = require('chroma-js')

function normalizeHex(input) {
  if (!input) return null
  const trimmed = String(input).trim()

  // Accept hex like #abc or aabbcc
  const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('')
    }
    return `#${hex.toLowerCase()}`
  }

  // Accept rgb(r,g,b) or r,g,b
  const rgbParen = trimmed.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  const rgbComma = !rgbParen && trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/)
  const m = rgbParen || rgbComma
  if (m) {
    const r = Math.min(255, Math.max(0, parseInt(m[1], 10)))
    const g = Math.min(255, Math.max(0, parseInt(m[2], 10)))
    const b = Math.min(255, Math.max(0, parseInt(m[3], 10)))
    return chroma.rgb(r, g, b).hex().toLowerCase()
  }

  return null
}

function makePalette(baseHex) {
  const base = chroma(baseHex)
  const lighten1 = base.brighten(0.6).hex()
  const lighten2 = base.brighten(1.2).hex()
  const darken1 = base.darken(0.8).hex()
  const darken2 = base.darken(1.6).hex()
  const h = base.get('hsl.h')
  const s = base.get('hsl.s')
  const l = base.get('hsl.l')
  const accent1 = chroma.hsl((h + 30) % 360, s, l).hex()
  const accent2 = chroma.hsl((h + 330) % 360, s, l).hex()
  const neutral = chroma.mix(baseHex, '#ffffff', 0.85, 'lab').hex()

  return {
    base: base.hex(),
    shades: [lighten1, lighten2, darken1, darken2],
    accents: [accent1, accent2],
    neutral,
  }
}

module.exports = {
  normalizeHex,
  makePalette,
}
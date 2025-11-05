const sharp = require('sharp')
const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')

function gradientSvg(width, height, from, to) {
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
}

function radialSvg(width, height, inner, outer) {
  const cx = width / 2
  const cy = height / 2
  const r = Math.max(width, height) / 2
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="rg" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${inner}"/><stop offset="100%" stop-color="${outer}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#rg)"/></svg>`
}

function stripesSvg(width, height, colors) {
  const stripeW = Math.max(16, Math.floor(width / (colors.length * 2)))
  let rects = ''
  for (let x = 0, i = 0; x < width; x += stripeW, i++) {
    const c = colors[i % colors.length]
    rects += `<rect x="${x}" y="0" width="${stripeW}" height="${height}" fill="${c}"/>`
  }
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}</svg>`
}

// Pattern SVGs
function dotsSvg(width, height, bgColor, dotColor) {
  const tile = 48
  const r = 6
  let shapes = `<rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}"/>`
  for (let y = r; y < height; y += tile) {
    const offset = ((y / tile) % 2) * (tile / 2)
    for (let x = r + offset; x < width; x += tile) {
      shapes += `<circle cx="${x}" cy="${y}" r="${r}" fill="${dotColor}" fill-opacity="0.9"/>`
    }
  }
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes}</svg>`
}

function gridSvg(width, height, bgColor, lineColor) {
  const tile = 64
  const sw = 2
  let shapes = `<rect x="0" y="0" width="${width}" height="${height}" fill="${bgColor}"/>`
  for (let x = 0; x <= width; x += tile) {
    shapes += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${lineColor}" stroke-opacity="0.35" stroke-width="${sw}"/>`
  }
  for (let y = 0; y <= height; y += tile) {
    shapes += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${lineColor}" stroke-opacity="0.35" stroke-width="${sw}"/>`
  }
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes}</svg>`
}

function checkerSvg(width, height, c1, c2) {
  const tile = 96
  let shapes = ''
  for (let y = 0, row = 0; y < height; y += tile, row++) {
    for (let x = 0, col = 0; x < width; x += tile, col++) {
      const color = (row + col) % 2 === 0 ? c1 : c2
      shapes += `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" fill="${color}"/>`
    }
  }
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes}</svg>`
}

async function svgToPng(svg, width, height) {
  return sharp(Buffer.from(svg))
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer()
}

async function generateWallpapers(palette, size = { width: 1080, height: 1920 }) {
  const { width, height } = size
  const solid = await sharp({
    create: { width, height, channels: 3, background: palette.base },
  })
    .png()
    .toBuffer()

  const grad = await svgToPng(
    gradientSvg(width, height, palette.shades[0], palette.shades[2]),
    width,
    height,
  )

  const radial = await svgToPng(
    radialSvg(width, height, palette.accents[0], palette.accents[1]),
    width,
    height,
  )

  const stripes = await svgToPng(
    stripesSvg(width, height, [palette.base, ...palette.shades, ...palette.accents]),
    width,
    height,
  )

  const dots = await svgToPng(
    dotsSvg(width, height, palette.neutral, palette.accents[0]),
    width,
    height,
  )

  const grid = await svgToPng(
    gridSvg(width, height, palette.base, palette.shades[2]),
    width,
    height,
  )

  const checker = await svgToPng(
    checkerSvg(width, height, palette.shades[0], palette.shades[2]),
    width,
    height,
  )

  return [
    { name: 'wallpaper_solid.png', buffer: solid },
    { name: 'wallpaper_gradient.png', buffer: grad },
    { name: 'wallpaper_radial.png', buffer: radial },
    { name: 'wallpaper_stripes.png', buffer: stripes },
    { name: 'wallpaper_dots.png', buffer: dots },
    { name: 'wallpaper_grid.png', buffer: grid },
    { name: 'wallpaper_checker.png', buffer: checker },
  ]
}

function circleSvg(size, fill) {
  const r = size / 2 - 8
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${fill}"/></svg>`
}

function ringSvg(size, stroke) {
  const r = size / 2 - 24
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${stroke}" stroke-width="48"/></svg>`
}

function roundedSquareSvg(size, fill) {
  const pad = 16
  const side = size - pad * 2
  const rx = 64
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="${pad}" y="${pad}" width="${side}" height="${side}" rx="${rx}" ry="${rx}" fill="${fill}"/></svg>`
}

function heartSvg(size, fill) {
  // Simple heart path centered in the canvas
  const s = size
  const path = `M ${s * 0.5} ${s * 0.8} C ${s * 0.2} ${s * 0.6}, ${s * 0.1} ${s * 0.35}, ${s * 0.25} ${s * 0.25} C ${s * 0.4} ${s * 0.1}, ${s * 0.55} ${s * 0.2}, ${s * 0.5} ${s * 0.3} C ${s * 0.45} ${s * 0.2}, ${s * 0.6} ${s * 0.1}, ${s * 0.75} ${s * 0.25} C ${s * 0.9} ${s * 0.35}, ${s * 0.8} ${s * 0.6}, ${s * 0.5} ${s * 0.8} Z`
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${path}" fill="${fill}"/></svg>`
}

async function generateStickers(palette, size = 512) {
  const items = []
  const shapes = [
    { name: 'circle', svg: circleSvg(size, palette.base), emojis: '🎨' },
    { name: 'ring', svg: ringSvg(size, palette.shades[2]), emojis: '🟢' },
    { name: 'rounded_square', svg: roundedSquareSvg(size, palette.shades[0]), emojis: '🟥' },
    { name: 'heart', svg: heartSvg(size, palette.accents[0]), emojis: '❤️' },
  ]
  for (const shape of shapes) {
    const buffer = await sharp(Buffer.from(shape.svg)).png().toBuffer()
    items.push({ name: `sticker_${shape.name}.png`, buffer, emojis: shape.emojis })
  }
  return items
}

async function generateEmojis(palette, size = 100) {
  const colors = [palette.base, ...palette.shades, ...palette.accents]
  const items = []
  const assignedEmoji = ['🎨', '🟧', '🟩', '🟦', '🟥', '🟪', '🟨']
  let i = 0
  for (const c of colors.slice(0, 7)) {
    const pad = Math.round(size * 0.08)
    const radius = Math.round(size * 0.12)
    const rectSvg = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" rx="${radius}" ry="${radius}" fill="${c}"/></svg>`
    const buffer = await sharp(Buffer.from(rectSvg)).png({ compressionLevel: 9 }).toBuffer()
    items.push({ name: `emoji_${i + 1}.png`, buffer, emojis: assignedEmoji[i % assignedEmoji.length] })
    i++
  }
  return items
}

// Face generators (smile, sad, angry)
function faceSvg(size, faceFill, featureColor, type) {
  const cx = size / 2
  const cy = size / 2
  const faceR = Math.round(size * 0.45)
  const eyeR = Math.round(size * 0.06)
  const eyeY = Math.round(size * 0.4)
  const eyeLX = Math.round(size * 0.33)
  const eyeRX = Math.round(size * 0.67)
  const mouthY = Math.round(size * 0.68)
  const mouthW = Math.round(size * 0.26)
  const mouthCurve = Math.round(size * 0.12)
  const strokeW = Math.max(2, Math.round(size * 0.06))

  const mouthSmile = `M ${cx - mouthW} ${mouthY} Q ${cx} ${mouthY - mouthCurve} ${cx + mouthW} ${mouthY}`
  const mouthSad = `M ${cx - mouthW} ${mouthY} Q ${cx} ${mouthY + mouthCurve} ${cx + mouthW} ${mouthY}`
  const mouthAngry = `M ${cx - mouthW} ${mouthY} L ${cx + mouthW} ${mouthY}`

  const browY = Math.round(size * 0.32)
  const browLen = Math.round(size * 0.18)
  const browLeft = `M ${eyeLX - browLen / 2} ${browY + 6} L ${eyeLX + browLen / 2} ${browY - 6}`
  const browRight = `M ${eyeRX - browLen / 2} ${browY - 6} L ${eyeRX + browLen / 2} ${browY + 6}`

  const mouthPath = type === 'sad' ? mouthSad : type === 'angry' ? mouthAngry : mouthSmile

  const eyebrows =
    type === 'angry'
      ? `<path d="${browLeft}" stroke="${featureColor}" stroke-width="${Math.round(strokeW * 0.7)}" stroke-linecap="round" fill="none"/>
         <path d="${browRight}" stroke="${featureColor}" stroke-width="${Math.round(strokeW * 0.7)}" stroke-linecap="round" fill="none"/>`
      : ''

  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${faceFill}"/>
    <circle cx="${eyeLX}" cy="${eyeY}" r="${eyeR}" fill="${featureColor}"/>
    <circle cx="${eyeRX}" cy="${eyeY}" r="${eyeR}" fill="${featureColor}"/>
    ${eyebrows}
    <path d="${mouthPath}" stroke="${featureColor}" stroke-width="${strokeW}" stroke-linecap="round" fill="none"/>
  </svg>`
}

async function generateStickerFaces(palette, size = 512) {
  const faceFill = palette.shades[0]
  const featureColor = '#1a1a1a'
  const variants = [
    { name: 'smile', emojis: '🙂' },
    { name: 'sad', emojis: '🙁' },
    { name: 'angry', emojis: '😠' },
  ]
  const items = []
  for (const v of variants) {
    const svg = faceSvg(size, faceFill, featureColor, v.name)
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
    items.push({ name: `sticker_face_${v.name}.png`, buffer, emojis: v.emojis })
  }
  return items
}

async function generateEmojiFaces(palette, size = 100) {
  const faceFill = palette.shades[0]
  const featureColor = '#1a1a1a'
  const variants = [
    { name: 'smile', emojis: '🙂' },
    { name: 'sad', emojis: '🙁' },
    { name: 'angry', emojis: '😠' },
  ]
  const items = []
  for (const v of variants) {
    const svg = faceSvg(size, faceFill, featureColor, v.name)
    const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
    items.push({ name: `emoji_face_${v.name}.png`, buffer, emojis: v.emojis })
  }
  return items
}

async function buildZip({ wallpapers, stickers, emojis }) {
  const zip = new JSZip()
  const w = zip.folder('wallpapers')
  const s = zip.folder('stickers')
  const e = zip.folder('emojis')
  for (const item of wallpapers) w.file(item.name, item.buffer)
  for (const item of stickers) s.file(item.name, item.buffer)
  for (const item of emojis) e.file(item.name, item.buffer)
  return zip.generateAsync({ type: 'nodebuffer' })
}

// Recolor an arbitrary PNG to a given hex, preserving transparency and shading.
// If kind is 'sticker', output 512x512; if 'emoji', output 100x100.
async function recolorPng(inputBuffer, hex, kind = 'sticker') {
  const size = kind === 'emoji' ? 100 : 512
  const pngOpts = kind === 'emoji' ? { compressionLevel: 9 } : {}
  const buffer = await sharp(inputBuffer)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toColourspace('srgb')
    .modulate({ saturation: 0 }) // grayscale to preserve shading
    .tint(hex)
    .png(pngOpts)
    .toBuffer()
  const name = kind === 'emoji' ? 'emoji_recolored.png' : 'sticker_recolored.png'
  return { name, buffer }
}

// Helpers to load user-provided PNGs from assets directories and recolor them
async function listPngFiles(dir) {
  try {
    if (!fs.existsSync(dir)) return []
    const entries = await fs.promises.readdir(dir)
    return entries.filter((f) => f.toLowerCase().endsWith('.png')).map((f) => path.join(dir, f))
  } catch {
    return []
  }
}

async function generateUserStickersFromAssets(hex) {
  const dir = path.resolve(__dirname, '..', 'assets', 'stickers')
  const files = await listPngFiles(dir)
  const items = []
  for (const file of files) {
    try {
      const input = await fs.promises.readFile(file)
      const out = await recolorPng(input, hex, 'sticker')
      const base = path.parse(file).name
      items.push({ name: `sticker_${base}_recolored.png`, buffer: out.buffer, emojis: '🎨' })
    } catch (e) {
      // Skip problematic files
    }
  }
  return items
}

async function generateUserEmojisFromAssets(hex) {
  const dir = path.resolve(__dirname, '..', 'assets', 'emojis')
  const files = await listPngFiles(dir)
  const items = []
  for (const file of files) {
    try {
      const input = await fs.promises.readFile(file)
      const out = await recolorPng(input, hex, 'emoji')
      const base = path.parse(file).name
      items.push({ name: `emoji_${base}_recolored.png`, buffer: out.buffer, emojis: '🎨' })
    } catch (e) {
      // Skip problematic files
    }
  }
  return items
}

module.exports = {
  generateWallpapers,
  generateStickers,
  generateEmojis,
  generateStickerFaces,
  generateEmojiFaces,
  generateUserStickersFromAssets,
  generateUserEmojisFromAssets,
  recolorPng,
  buildZip,
}
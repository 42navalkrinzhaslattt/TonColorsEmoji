require('dotenv').config()
const { Telegraf } = require('telegraf')
const https = require('https')
const { normalizeHex, makePalette } = require('./palette')
const {
  generateWallpapers,
  generateStickers,
  generateEmojis,
  generateStickerFaces,
  generateEmojiFaces,
  generateUserStickersFromAssets,
  generateUserEmojisFromAssets,
  recolorPng,
  buildZip,
} = require('./generateAssets')

const BOT_TOKEN = process.env.BOT_TOKEN
if (!BOT_TOKEN) {
  console.error('Missing BOT_TOKEN in environment. Create a .env file with BOT_TOKEN=...')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

bot.start((ctx) => {
  ctx.reply(
    'Welcome! Send me a hex color (e.g., #3498db or 3498db) and I will generate wallpapers, a sticker pack, and emoji-style squares for that palette.'
  )
})

// /recolor <hex> [emoji|sticker]
// Usage: reply to a PNG (document or photo) with /recolor #ff6b6b emoji
bot.command('recolor', async (ctx) => {
  try {
    const parts = ctx.message.text.split(/\s+/).slice(1)
    const rawHex = parts[0]
    const kindArg = (parts[1] || 'sticker').toLowerCase()
    const kind = kindArg === 'emoji' ? 'emoji' : 'sticker'

    const hex = normalizeHex(rawHex)
    if (!hex) {
      return ctx.reply('Usage: reply to a PNG with /recolor <hex> [emoji|sticker]')
    }

    // Prefer the image in the replied message
    const targetMsg = ctx.message.reply_to_message || ctx.message
    let fileId = null
    if (targetMsg.photo?.length) {
      // Use the largest photo variant
      fileId = targetMsg.photo[targetMsg.photo.length - 1].file_id
    } else if (targetMsg.document?.mime_type === 'image/png') {
      fileId = targetMsg.document.file_id
    }

    if (!fileId) {
      return ctx.reply('Please send or reply to a PNG image, then run /recolor.')
    }

    // Download file buffer via Telegram file API
    const f = await ctx.telegram.getFile(fileId)
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${f.file_path}`
    const inputBuffer = await new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
        })
        .on('error', reject)
    })

    const out = await recolorPng(inputBuffer, hex, kind)
    await ctx.replyWithDocument({ source: out.buffer, filename: out.name }, {
      caption: `Recolored ${kind} for ${hex}.`
    })
  } catch (err) {
    console.error('Recolor failed:', err)
    await ctx.reply('Failed to recolor image. Make sure you replied to a PNG and try again.')
  }
})

// /wallpaper <hex> [style] [@username|chat_id]
bot.command('wallpaper', async (ctx) => {
  try {
    const parts = ctx.message.text.split(/\s+/).slice(1)
    const rawHex = parts[0]
    const styleArg = (parts[1] || 'solid').toLowerCase()
    const targetArg = parts[2]

    const hex = normalizeHex(rawHex)
    if (!hex) {
      return ctx.reply('Usage: /wallpaper <hex> [solid|gradient|radial|stripes] [@username|chat_id]')
    }

    const validStyles = ['solid', 'gradient', 'radial', 'stripes', 'dots', 'grid', 'checker']
    const style = validStyles.includes(styleArg) ? styleArg : 'solid'

    const palette = makePalette(hex)
    const wallpapers = await generateWallpapers(palette)
    const styleMap = {
      solid: 'wallpaper_solid.png',
      gradient: 'wallpaper_gradient.png',
      radial: 'wallpaper_radial.png',
      stripes: 'wallpaper_stripes.png',
      dots: 'wallpaper_dots.png',
      grid: 'wallpaper_grid.png',
      checker: 'wallpaper_checker.png',
    }
    const targetName = styleMap[style]
    const item = wallpapers.find((w) => w.name === targetName) || wallpapers[0]

    let chatId = ctx.chat.id
    if (targetArg) {
      try {
        const chat = await ctx.telegram.getChat(targetArg)
        chatId = chat.id
      } catch (e) {
        // Fallback: try to parse numeric id
        if (/^-?\d+$/.test(targetArg)) {
          chatId = Number(targetArg)
        } else {
          await ctx.reply('Could not resolve target. I will send the wallpaper here.')
        }
      }
    }

    // Send as document to preserve full PNG quality
    await ctx.telegram.sendDocument(chatId, {
      source: item.buffer,
      filename: item.name,
    }, {
      caption: `Wallpaper (${style}) for ${hex}. Save and set as your background.`,
    })

    if (chatId !== ctx.chat.id) {
      await ctx.reply(`Sent ${style} wallpaper for ${hex} to target chat.`)
    }
  } catch (err) {
    console.error('Failed to send wallpaper:', err)
    await ctx.reply('Failed to export wallpaper. Ensure the target started the bot and try again.')
  }
})

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim()
  // Ignore commands to prevent duplicate handling alongside specific command routes
  if (text.startsWith('/')) return
  const hex = normalizeHex(text)
  if (!hex) {
    return ctx.reply('Please send a valid hex color like #aabbcc or aabbcc.')
  }

  const hexNoHash = hex.replace('#', '')
  const palette = makePalette(hex)
  await ctx.reply(`Generating assets for ${hex}…`) 

  try {
    const [wallpapers, stickers, emojis, faceStickers, faceEmojis] = await Promise.all([
      generateWallpapers(palette),
      generateStickers(palette),
      generateEmojis(palette),
      generateStickerFaces(palette),
      generateEmojiFaces(palette),
    ])
    const [userStickers, userEmojis] = await Promise.all([
      generateUserStickersFromAssets(hex),
      generateUserEmojisFromAssets(hex),
    ])

    const stickersAll = [...stickers, ...faceStickers, ...userStickers]
    const emojisAll = [...emojis, ...faceEmojis, ...userEmojis]

    const zipBuffer = await buildZip({ wallpapers, stickers: stickersAll, emojis: emojisAll })

    // Send a preview image for quick feedback
    await ctx.replyWithPhoto({ source: wallpapers[0].buffer }, { caption: 'Wallpaper preview (solid)' })

    // Send the full bundle as a zip
    await ctx.replyWithDocument({
      source: zipBuffer,
      filename: `color_${hexNoHash}_bundle.zip`,
    })

    if (userStickers.length || userEmojis.length) {
      await ctx.reply(
        `Included ${userStickers.length} custom stickers and ${userEmojis.length} custom emojis from assets/.`
      )
    }

    // Attempt to create a Telegram sticker pack for the user
    const me = ctx.botInfo || (await ctx.telegram.getMe())
    const botUsername = me.username
    // Sticker set names must be unique and generally end with _by_<botusername>
    const baseName = `toncolors_${hexNoHash}_${ctx.from.id}`.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const packName = `${baseName}_by_${botUsername}`.toLowerCase()
    const packTitle = `TON Color ${hex.toUpperCase()}`

    try {
      // Create the pack with the first sticker
      await ctx.telegram.callApi('createNewStickerSet', {
        user_id: ctx.from.id,
        name: packName,
        title: packTitle,
        sticker_format: 'static',
        png_sticker: { source: stickersAll[0].buffer, filename: stickersAll[0].name },
        emojis: stickersAll[0].emojis,
      })

      // Add remaining stickers
      for (let i = 1; i < stickersAll.length; i++) {
        await ctx.telegram.callApi('addStickerToSet', {
          user_id: ctx.from.id,
          name: packName,
          sticker_format: 'static',
          png_sticker: { source: stickersAll[i].buffer, filename: stickersAll[i].name },
          emojis: stickersAll[i].emojis,
        })
      }

      await ctx.reply(`Sticker pack created: https://t.me/addstickers/${packName}`)
    } catch (stErr) {
      const desc = stErr?.description || stErr?.message || ''
      console.warn('Sticker pack creation failed:', desc || stErr)
      // Fallback strategy: if the set name is invalid (often due to existing set),
      // try to add to an existing set; otherwise, try a unique alt name.
      if (/STICKERSET_INVALID/i.test(desc)) {
        try {
          const existing = await ctx.telegram.getStickerSet(packName)
          // Try adding stickers to the existing set (ignore per-sticker failures)
          for (let i = 0; i < stickersAll.length; i++) {
            try {
              await ctx.telegram.callApi('addStickerToSet', {
                user_id: ctx.from.id,
                name: packName,
                sticker_format: 'static',
                png_sticker: { source: stickersAll[i].buffer, filename: stickersAll[i].name },
                emojis: stickersAll[i].emojis,
              })
            } catch (addErr) {
              console.warn('Add sticker failed (continuing):', addErr?.description || addErr?.message || addErr)
            }
          }
          await ctx.reply(`Sticker pack exists, added stickers: https://t.me/addstickers/${packName}`)
        } catch (getErr) {
          // Could not find existing set; try a unique alt name
          const altName = `${baseName}_${Math.random().toString(36).slice(2, 6)}_by_${botUsername}`.toLowerCase()
          try {
            await ctx.telegram.callApi('createNewStickerSet', {
              user_id: ctx.from.id,
              name: altName,
              title: packTitle,
              sticker_format: 'static',
              png_sticker: { source: stickersAll[0].buffer, filename: stickersAll[0].name },
              emojis: stickersAll[0].emojis,
            })
            for (let i = 1; i < stickersAll.length; i++) {
              try {
                await ctx.telegram.callApi('addStickerToSet', {
                  user_id: ctx.from.id,
                  name: altName,
                  sticker_format: 'static',
                  png_sticker: { source: stickersAll[i].buffer, filename: stickersAll[i].name },
                  emojis: stickersAll[i].emojis,
                })
              } catch (addErr2) {
                console.warn('Add sticker (alt set) failed:', addErr2?.description || addErr2?.message || addErr2)
              }
            }
            await ctx.reply(`Sticker pack created: https://t.me/addstickers/${altName}`)
          } catch (altErr) {
            console.warn('Alt sticker pack creation failed:', altErr?.description || altErr?.message || altErr)
            await ctx.reply(
              'Could not create a Telegram sticker pack automatically (name conflict or format issue). The ZIP includes PNG stickers you can upload via @Stickers.'
            )
          }
        }
      } else {
        await ctx.reply(
          'Could not create a Telegram sticker pack automatically (permissions or format issue). The ZIP includes PNG stickers you can upload via @Stickers.'
        )
      }
    }

    // Attempt to create a custom emoji pack (Premium feature)
    const emojiBaseName = `tonemoji_${hexNoHash}_${ctx.from.id}`.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const emojiPackName = `${emojiBaseName}_by_${botUsername}`
    const emojiPackTitle = `TON Emoji ${hex.toUpperCase()}`

    try {
      await ctx.telegram.callApi('createNewStickerSet', {
        user_id: ctx.from.id,
        name: emojiPackName,
        title: emojiPackTitle,
        sticker_format: 'static',
        sticker_type: 'custom_emoji',
        png_sticker: { source: emojisAll[0].buffer, filename: emojisAll[0].name },
        emojis: emojisAll[0].emojis || '🎨',
      })

      for (let i = 1; i < emojisAll.length; i++) {
        await ctx.telegram.callApi('addStickerToSet', {
          user_id: ctx.from.id,
          name: emojiPackName,
          sticker_format: 'static',
          sticker_type: 'custom_emoji',
          png_sticker: { source: emojisAll[i].buffer, filename: emojisAll[i].name },
          emojis: emojisAll[i].emojis || '🎨',
        })
      }

      await ctx.reply(
        `Custom emoji pack created: https://t.me/addemoji/${emojiPackName} (Telegram Premium required to use custom emojis).`
      )
    } catch (ceErr) {
      console.warn('Custom emoji pack creation failed:', ceErr?.description || ceErr?.message || ceErr)
      await ctx.reply(
        'Could not create a custom emoji pack automatically. The ZIP includes color emoji PNGs; you can manually import with @Stickers (Premium custom emojis).'
      )
    }
  } catch (err) {
    console.error(err)
    await ctx.reply('Something went wrong generating assets. Please try another color or try again later.')
  }
})

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

bot.launch()
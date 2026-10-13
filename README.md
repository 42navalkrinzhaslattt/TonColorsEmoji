# TON Colors Telegram Bot

A Telegram bot that turns one color into a full asset set: phone wallpapers, a sticker pack and a custom emoji pack,
all generated on the fly from a palette derived from that color and delivered as a ZIP plus ready-to-add Telegram packs.

**Stack:** Node.js · Telegraf · sharp · chroma-js · JSZip    **Context:** Personal project, 2025

## How it works

1. **Palette.** The input color (`#3498db`, `3498db`, `#abc`, `rgb(52,152,219)` or `52,152,219`) is normalized to
   hex, then `chroma-js` derives a palette: two lighter and two darker shades, two analogous accents (hue ±30°) and a
   near-white neutral mixed in Lab space.
2. **Rendering.** Every asset is an SVG string built from the palette and rasterized with `sharp`:
   - Wallpapers, 1080×1920: solid, linear gradient, radial, stripes, dots, grid, checker
   - Stickers, 512×512 with transparent background: circle, ring, rounded square, heart, plus smile/sad/angry faces
   - Emojis, 100×100: up to 7 rounded color squares plus the three faces
3. **Custom art.** Any PNG in `assets/stickers/` or `assets/emojis/` is resized, desaturated to keep its shading,
   then tinted to the requested color.
4. **Delivery.** The bot sends a wallpaper preview and a ZIP (`wallpapers/`, `stickers/`, `emojis/`), then creates a
   static sticker set and a `custom_emoji` set through the Bot API (`createNewStickerSet` / `addStickerToSet`) and
   replies with the `t.me/addstickers/...` and `t.me/addemoji/...` links. If the set name already exists, it adds to
   the existing set or retries with a random suffix; if that fails too, it points the user to `@Stickers` for a
   manual upload.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Create a `.env` file at the project root (see `.env.example`):

   ```
   BOT_TOKEN=your-bot-token-here
   ```

3. Install dependencies and run the bot (long polling):

   ```bash
   npm install
   npm start
   ```

## Usage

Send the bot a color, e.g. `#3498db`. It replies with:

- a wallpaper preview image
- `color_<hex>_bundle.zip` with all wallpapers, stickers and emojis, including recolored custom assets
- links to the generated sticker pack and custom emoji pack (using custom emoji requires Telegram Premium)

### Commands

| Command | Description |
|---|---|
| `/start` | Short introduction |
| `/wallpaper <hex> [style] [target]` | Send a single wallpaper as a PNG document. `style`: `solid` (default), `gradient`, `radial`, `stripes`, `dots`, `grid`, `checker`. `target`: optional `@username` or chat ID to send it to another chat that has started the bot |
| `/recolor <hex> [sticker\|emoji]` | Reply to a PNG (photo or document) to get it tinted to `<hex>` at 512×512 (sticker, default) or 100×100 (emoji) |

## Custom assets

- `assets/stickers/`: any PNG, resized to 512×512
- `assets/emojis/`: any PNG, resized to 100×100

Transparency is preserved. Every color request recolors these files and includes them in the ZIP and in the packs.

## Notes

- Bots cannot set chat wallpapers (`account.uploadWallPaper` is a user-account MTProto method), so wallpapers are sent
  as PNG files to save and apply manually.
- Generated stickers follow the static sticker format (512×512 PNG, transparent background) and emojis the custom emoji
  format (100×100 PNG).
- Pack names follow the required `<name>_by_<botusername>` pattern and include the color and the user ID.

## Project structure

```
src/bot.js             Telegraf handlers: color messages, /wallpaper, /recolor, pack creation
src/generateAssets.js  SVG builders, sharp rendering, recoloring, ZIP bundling
src/palette.js         color parsing and palette generation
assets/                optional custom PNGs to recolor
```

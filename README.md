# TON Colors Telegram Bot

Generates wallpapers, sticker PNGs, and emoji-style assets from a user-provided hex color, then bundles everything into a ZIP. The bot also attempts to create a Telegram sticker pack and a custom emoji pack for the requesting user.

## Setup

1. Create a bot with BotFather and copy the token.
2. Create a `.env` file at the project root:

```
BOT_TOKEN=123456789:AbCdefGhIJKlmNoPQRsTUVwxyZ
```

3. Install dependencies:

```
npm install
```

4. Run the bot:

```
npm start
```

## Usage

- Send the bot a hex color like `#3498db` or `3498db`.
- The bot replies with:
  - A preview wallpaper image.
  - A ZIP containing:
    - `wallpapers/` PNGs (solid, gradient, radial, stripes, dots, grid, checker) sized 1080×1920.
    - `stickers/` PNGs sized 512×512:
      - Shapes: circle, ring, rounded square, heart
      - Faces: smile, sad, angry (colored from your palette)
    - `emojis/` PNGs sized 100×100:
      - Color squares (up to 7 variants)
      - Faces: smile, sad, angry (colored from your palette)
    - Custom assets (if present): recolored PNGs from `assets/stickers` and `assets/emojis`
- The bot attempts to create packs and returns links:
  - Sticker pack: `https://t.me/addstickers/<name>`
  - Custom emoji pack: `https://t.me/addemoji/<name>` (Telegram Premium required to use as custom emojis)
  - If creation fails, you can manually upload via `@Stickers`.

## Notes

- Telegram MTProto wallpaper methods like `account.uploadWallPaper` are for user accounts, not bots; the bot sends PNGs you can save as wallpapers.
- Sticker creation may fail due to format constraints or permissions. The included PNGs meet Telegram static sticker requirements (512×512 PNG, transparent background).
- Custom emoji creation follows Telegram requirements (static PNG, 100×100, size limit), and using custom emojis requires Telegram Premium.
- Color palette is generated from your base color using lighten/darken and analogous variations.

## Custom Assets

- Put your source PNGs in:
  - `assets/stickers/` (any PNG; resized to 512×512)
  - `assets/emojis/` (any PNG; resized to 100×100)
- Transparency is preserved; images are grayscaled to keep shading, then tinted to your requested color.
- On each color request, the bot will recolor these files and include them in the ZIP and pack creation.

## Tech

- Bot: [Telegraf.js](https://telegraf.js.org/) (Node.js Telegram Bot API)
- Image generation: `sharp` with SVG rasterization (fast and portable)
- Color utilities: `chroma-js`
- Bundling: `JSZip`

## Commands

- `/wallpaper <hex> [style] [target]`
  - `hex`: base color, e.g., `#ff6b6b`
  - `style`: `solid`, `gradient`, `radial`, `stripes`, `dots`, `grid`, or `checker` (default: `solid`)
  - `target`: optional `@username` or chat ID to send to another user/chat; omit to send to current chat
  - Sends the generated wallpaper as a PNG document to preserve quality
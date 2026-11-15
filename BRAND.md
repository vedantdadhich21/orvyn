# Brand

Everything here is one system: the same green, the same two typefaces, and one
mark — the **O** from the wordmark. The favicon, the app icon and the profile
picture are all exports of that single outline, so they cannot drift apart.

## Palette

| Token | Hex | Use |
|---|---|---|
| Charcoal | `#111214` | Page and banner background. Everything sits on this. |
| Brand | `#2BD98B` | The one accent. Marks the single most important thing in a frame. |
| Brand deep | `#1E8F63` | Terminus for brand gradients; not for text on charcoal. |
| Ink | `#F5F6F7` | Body and display type. |
| Muted | `#8A8F98` | Labels, captions, anything deliberately secondary. |

Green is a spotlight, not a decoration. One green element per view — a button, a
value, a dot. Two green elements competing is a bug.

## Type

- **Inter** — everything. Weight 700 for the wordmark and titles, 500 for UI
  text, 400 for body.
- **JetBrains Mono** — every number the reader might compare against another
  number. Tabular figures, so a value that changes does not jitter.

## Assets

All in `apps/web/public/brand`, plus the app icons that Next.js picks up
automatically.

| File | Size | Use |
|---|---|---|
| `avatar-400.png` | 400×400 | X and GitHub profile picture |
| `avatar-1000.png` | 1000×1000 | Higher-resolution profile picture |
| `banner-1500x500.png` | 1500×500 | X header |
| `og.png` | 1200×630 | Link previews |
| `logo-wordmark.svg` | vector | Green O, white letters — for dark surfaces |
| `logo-wordmark-white.svg` | vector | All white — one-colour use |
| `logo-wordmark-mono.svg` | vector | All charcoal — for brand or light backgrounds |
| `brand-sheet.png` | 1400×1180 | One-page reference |
| `src/app/icon.svg` | vector | Favicon |
| `src/app/apple-icon.png` | 180×180 | iOS home screen |

## Rules

1. **The mark is the wordmark's O.** The avatar is that O inverted: charcoal on
   brand green. No second symbol.
2. **The avatar must read at 20px.** That is why it is a solid tile rather than a
   thin outline, and why the O is large in the frame.
3. **No rockets, coins, candlesticks, arrows or bar charts.** They are the
   fastest way to look like every other finance account.
4. **Keep the banner's content in the middle band.** The X avatar overlaps the
   lower-left corner; nothing important goes there.
5. **Do not stretch, re-colour or add effects to the wordmark.** If it needs to
   sit on green, use the mono version.

## How these were made

The wordmark is Inter 700 at optical size 32, shaped with HarfBuzz so the letter
spacing is the type designer's rather than an approximation, then converted to
outlines. No file in this folder depends on a font being installed, and the PNGs
are rendered from the same SVGs, so the raster and vector match exactly.

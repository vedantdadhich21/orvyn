# Brand

One mark, one green, two typefaces. The mark is a bold open ring in brand green
sitting in a charcoal tile. On the app's charcoal surfaces the tile disappears
and the ring carries the identity; on light backgrounds the tile does the work.

## Palette

| Token | Hex | Use |
|---|---|---|
| Charcoal | `#111214` | Page, banner and tile background. |
| Brand | `#2BD98B` | The ring, and one value per frame. Nothing else. |
| Brand deep | `#1E8F63` | Gradient terminus only; not for text on charcoal. |
| Ink | `#F5F6F7` | Body and display type. |
| Muted | `#8A8F98` | Labels, captions, anything deliberately secondary. |

Green is a spotlight, not decoration. One green element per view — the ring, or
a value, never both.

## Type

- **Inter** — everything. Weight 700 for the wordmark and titles, 500 for UI
  text, 400 for body.
- **JetBrains Mono** — every number the reader might compare against another
  number. Tabular figures, so a value that changes does not jitter.

## Assets

In `apps/web/public/brand`, plus the two icons Next.js picks up automatically.

| File | Size | Use |
|---|---|---|
| `avatar-400.png` | 400×400 | X and GitHub profile picture |
| `avatar-1000.png` | 1000×1000 | Higher-resolution profile picture |
| `banner-1500x500.png` | 1500×500 | X header |
| `og.png` | 1200×630 | Link previews |
| `logo-mark.svg` | vector | The full mark: charcoal tile, green ring |
| `logo-ring.svg` | vector | Ring alone, for charcoal surfaces |
| `logo-wordmark.svg` | vector | Ring plus white name — dark surfaces |
| `logo-wordmark-ink.svg` | vector | Ring plus charcoal name — light surfaces |
| `logo-wordmark.png` | 1600px wide | Raster, for tools that will not take SVG |
| `brand-sheet.png` | 1400×1340 | One-page reference |
| `src/app/icon.svg` | vector | Favicon |
| `src/app/apple-icon.png` | 180×180 | iOS home screen |

## Rules

1. **The mark is the ring.** Nothing is drawn inside it, and nothing is added
   around it. Do not trace it, redraw it or change its stroke weight.
2. **On charcoal, use the ring alone.** The tile is the same colour as the
   surface, so including it only adds a faint square.
3. **On light backgrounds, use the tile.** That is what the tile is for.
4. **The ring is thick on purpose.** It has to survive 24px. Favicons use a
   slightly larger ring (68% rather than 61%) because below 20px the counter
   fills in and the mark turns into a green disc.
5. **No rockets, coins, candlesticks, arrows or bar charts.** They are the
   fastest way to look like every other finance account.
6. **Keep the banner's content in the middle band.** The X avatar overlaps the
   lower-left corner; nothing important goes there.

## How these were made

The mark is used exactly as supplied. Only the white canvas behind it was
removed, and the tile scaled so its proportions (750 of 1024, ring at 61% of the
tile) match the original.

The wordmark is Inter 700 at optical size 32, shaped with HarfBuzz so the letter
spacing is the type designer's rather than an approximation, then converted to
outlines. No file in this folder depends on a font being installed, and every
PNG is rendered from the matching SVG, so raster and vector cannot drift.

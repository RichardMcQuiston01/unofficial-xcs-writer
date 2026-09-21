# API Reference

## `assertXcsFormat(buffer: ArrayBuffer): void`

Validates that `buffer` is a parseable XCS JSON file containing a `canvas` array. Throws a descriptive error if the file is invalid or unrecognized.

## `readXcsFile(buffer: ArrayBuffer): string`

Decodes the buffer and returns the raw JSON string. Useful for inspection or pass-through scenarios.

## `extractXcsTokens(buffer: ArrayBuffer): string[]`

Scans all `TEXT` display objects across all canvases and returns the unique token names found (without braces). For example, `{{LastName}}` in the file → `"LastName"` in the returned array.

## `renderXcsFile(buffer, variables, values, fonts?): Uint8Array`

Applies substitution to every `TEXT` display object and returns the modified file encoded as a UTF-8 `Uint8Array`. Tokens with no matching entry in `values` fall back to `variable.defaultValue`, or an empty string if no default is set.

Whenever a display's text actually changes, its glyph outline data (`charJSONs` / `fontData.glyphData`) is regenerated from a real font so xTool Studio renders the new text correctly — xTool Studio only trusts a TEXT display's stored glyph shapes; it does not re-shape text on its own unless you manually reselect the font inside the app. Displays whose text doesn't change are left completely untouched.

Pass `fonts` to supply real font file bytes (TTF/OTF/WOFF) keyed by a display's `style.fontFamily`:

```ts
const arialBuffer = await fetch('/fonts/arial.ttf').then(r => r.arrayBuffer());
renderXcsFile(buffer, variables, values, { Arial: arialBuffer });
```

Any `fontFamily` not present in `fonts` falls back to a bundled default (Arimo, Apache-2.0, metric-compatible with Arial) — so the fix works out of the box with no font files required, just with shapes drawn from Arimo rather than the exact requested typeface.

**Known limitation:** `renderXcsFile` only reproduces straight horizontal-baseline layout when substituting into an *existing* TEXT display. xTool Studio's `style.curveX`/`curveY` curved-text formula is undocumented and can't be reverse-decoded from a file alone, so a curved display's substituted text gets correctly-shaped glyphs laid out straight instead of on the original curve. This doesn't apply to the *building* API below — there, you supply the curve angle yourself (see `layoutCurvedGlyphText`), so there's nothing to decode.

## `XcsVariable`

```ts
interface XcsVariable {
  token: string;        // token name without braces, e.g. "LastName"
  defaultValue?: string;
}
```

## `.xs` (v2 workspace) format

## `assertXsFormat(buffer: ArrayBuffer): void`

Validates that `buffer` is a ZIP archive with a `.format` entry equal to `"v2"` and a `project.json` entry. Throws a descriptive error otherwise.

## `extractXsTokens(buffer: ArrayBuffer): string[]`

Same as `extractXcsTokens`, but scans every `canvases/<canvasId>/displays-<chunkIndex>.json` chunk across the archive instead of a single `canvas` array.

## `renderXsFile(buffer, variables, values, fonts?): Uint8Array`

Same substitution and glyph-regeneration behavior as `renderXcsFile` (see above — including the same `fonts` parameter and curved-text limitation), applied to every displays chunk. Returns a re-zipped `.xs` archive; every entry other than the modified displays chunks is passed through byte-for-byte unchanged.

## `buildXsArchive(file: XCSFile): Uint8Array`

Packages an already-`generate()`d project (see Building, below) into a `.xs` v2 ZIP archive. You won't normally call this directly — use `XCSGenerator.toXsBytes()` instead, which calls it for you.

## `loadFont(buffer: ArrayBuffer)` / `loadDefaultFont()` / `layoutText(font, text, originX, originY)`

Lower-level glyph-extraction primitives everything else in this library is built on, exported for direct use. See `src/glyphs.ts` for the exact xTool JSON conventions these were reverse-engineered against.

## Building (`src/builder.ts`, `src/layout.ts`, `src/machines.ts`)

`createXCS(deviceId?)` / `new XCSGenerator(options?)` — starts a new project (one canvas, one default layer). `deviceId` (and `options.deviceId`) accepts a `XTOOL_MACHINES` key, a `MachineProfile` object, or a raw device id string — see "Building a project from scratch" in the [README](./README.md). Chainable methods:

| Method | Adds |
|--------|------|
| `.addText(text, x, y, options?)` | A `TEXT` display. Pass `options.layout` (see below) for real glyph outlines — without it, text renders as placeholder blocks in xTool Studio. |
| `.addPath(pathData, x, y, width, height, options?)` | A `PATH` display from SVG path data. |
| `.addBitmap(pngBase64, x, y, widthMm, heightMm, originWidthPx, originHeightPx, options?)` | An embedded PNG, physically sized in mm. |
| `.addLayer(color, name, order)` | A named, colored layer (one `#00befe` "Cyan" layer exists by default). |

`.addText()`/`.addPath()`/`.addBitmap()` all also accept a `processing: { processingType, values }` option — see "Building a project from scratch" in the [README](./README.md); it only affects `.toXsBytes()` output.

Then `.generate()` (the plain `XCSFile` object), `.toJSON()` (string), `.toBytes()` (`Uint8Array`, matching `renderXcsFile`'s output type, as `.xcs`), or `.toXsBytes()` (`Uint8Array`, matching `renderXsFile`'s output type, as `.xs`).

Text layout — build the `layout` option for `.addText()` with one of:

| Function | Layout |
|----------|--------|
| `layoutGlyphText(font, text, emSizeMm, xMm, yMm, letterSpacingMm?)` | Single-line, straight, anchored so the ink box's top-left lands at `(xMm, yMm)`. |
| `layoutMultilineGlyphText(font, text, emSizeMm, letterSpacingMm, lineHeightMult, align)` | Multi-line (`\n`-separated), straight, each line aligned and vertically stacked. |
| `layoutCurvedGlyphText(font, text, emSizeMm, curveDeg, boxWidthMm, boxHeightMm, align?, letterSpacingMm?)` | Single-line, curved along an arc spanning `curveDeg` degrees across a `boxWidthMm`-wide box (positive arches the apex upward, negative bows it downward — same convention as SVG `<textPath>`/canvas curved-text editors). Multi-line curved text isn't supported (matches typical curved-text editors, which also flatten multi-line curved text to one line). **Not yet visually verified against real xTool Studio rendering** (there's no way to check outside the application itself) — the geometry is self-consistent and unit-tested, but treat curved output as best-effort until you've spot-checked it. |

All three return `GlyphTextLayout | null` (`null` for empty/whitespace-only text). `translateGlyphLayout(layout, dxMm, dyMm)` cheaply shifts an already-built layout without relaying out the font.

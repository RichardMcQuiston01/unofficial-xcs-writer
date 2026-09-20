# unofficial-xcs-writer

A framework-agnostic TypeScript library for reading, writing, building, and applying variable substitution to `.xcs` and `.xs` files produced by [xTool Creative Space](https://www.xtool.com/pages/software). Not affiliated with xTool.

## What is an XCS / XS file?

An `.xcs` file is a plain UTF-8 JSON document exported by xTool Creative Space. It describes a laser project — canvas dimensions, design objects (shapes, text, images), layer assignments, and device parameters.

Starting with xTool Studio v1.7, new projects are saved as `.xs` instead — a ZIP archive of several JSON files (project metadata, per-canvas display chunks, processing profiles, device bindings, and binary resources as real files rather than inline base64). `.xcs` is now legacy: v1.7+ can still open `.xcs` files but can no longer save back to that format. See `src/xs.ts` for the full format writeup.

This library lets you, for both formats:

- **Read** a file and inspect its contents
- **Extract** `{{token}}` template placeholders from text objects
- **Render** a filled-in copy by substituting values for those placeholders
- **Build** a new `.xcs` project from scratch — text (straight, multi-line, or curved), paths, and embedded images (`.xs` generation isn't supported yet — see `CLAUDE.md`'s "Open Issues")

## Installation

```bash
npm install @richardmcquiston01/unofficial-xcs-writer
# or
pnpm add @richardmcquiston01/unofficial-xcs-writer
```

## Usage

```ts
import { assertXcsFormat, extractXcsTokens, renderXcsFile } from '@richardmcquiston01/unofficial-xcs-writer';
import type { XcsVariable } from '@richardmcquiston01/unofficial-xcs-writer';

// Load an .xcs file as an ArrayBuffer (browser or Node.js)
const buffer = await fetch('/templates/name-tag.xcs').then(r => r.arrayBuffer());

// Validate it's a real XCS file
assertXcsFormat(buffer); // throws if invalid

// Discover which {{token}} placeholders are in the file
const tokens = extractXcsTokens(buffer);
// e.g. ['FirstName', 'LastName']

// Define variables and supply values
const variables: XcsVariable[] = [
  { token: 'FirstName', defaultValue: 'Guest' },
  { token: 'LastName' },
];
const values = { FirstName: 'Jane', LastName: 'Smith' };

// Produce a filled-in .xcs file ready for download
const output: Uint8Array = renderXcsFile(buffer, variables, values);
```

### Working with `.xs` files

Same shape, different functions — `.xs` is a ZIP archive, so there's no `readXsFile` equivalent to `readXcsFile` (there's no single JSON string to return), but token extraction and substitution work the same way:

```ts
import { assertXsFormat, extractXsTokens, renderXsFile } from '@richardmcquiston01/unofficial-xcs-writer';

const buffer = await fetch('/templates/name-tag.xs').then(r => r.arrayBuffer());

assertXsFormat(buffer); // throws if invalid
const tokens = extractXsTokens(buffer); // e.g. ['FirstName', 'LastName']

const output: Uint8Array = renderXsFile(buffer, variables, values);
```

### Building a project from scratch

```ts
import {
  createXCS,
  loadDefaultFont,
  layoutGlyphText,
  layoutCurvedGlyphText,
} from '@richardmcquiston01/unofficial-xcs-writer';

const font = loadDefaultFont();

const project = createXCS('P2S')
  // Straight text needs a real glyph layout so xTool Studio renders
  // actual outlines instead of placeholder blocks.
  .addText('Hello', 10, 10, {
    fontFamily: 'Arial',
    fontSize: 24,
    layout: layoutGlyphText(font, 'Hello', 8, 10, 10),
  })
  // Curved text: same idea, via layoutCurvedGlyphText -- the curve
  // is baked into each character's own glyph shape and position, the
  // way substituted text already bakes straight shapes.
  .addText('Arch Text', 0, 40, {
    fontFamily: 'Arial',
    fontSize: 18,
    layout: layoutCurvedGlyphText(font, 'Arch Text', 6, 90, 60, 20, 'center'),
  })
  .addPath('M0 0L10 0L10 10L0 10Z', 0, 60, 10, 10)
  .toBytes(); // Uint8Array, ready to write to a .xcs file
```

## API

### `assertXcsFormat(buffer: ArrayBuffer): void`

Validates that `buffer` is a parseable XCS JSON file containing a `canvas` array. Throws a descriptive error if the file is invalid or unrecognized.

### `readXcsFile(buffer: ArrayBuffer): string`

Decodes the buffer and returns the raw JSON string. Useful for inspection or pass-through scenarios.

### `extractXcsTokens(buffer: ArrayBuffer): string[]`

Scans all `TEXT` display objects across all canvases and returns the unique token names found (without braces). For example, `{{LastName}}` in the file → `"LastName"` in the returned array.

### `renderXcsFile(buffer, variables, values, fonts?): Uint8Array`

Applies substitution to every `TEXT` display object and returns the modified file encoded as a UTF-8 `Uint8Array`. Tokens with no matching entry in `values` fall back to `variable.defaultValue`, or an empty string if no default is set.

Whenever a display's text actually changes, its glyph outline data (`charJSONs` / `fontData.glyphData`) is regenerated from a real font so xTool Studio renders the new text correctly — xTool Studio only trusts a TEXT display's stored glyph shapes; it does not re-shape text on its own unless you manually reselect the font inside the app. Displays whose text doesn't change are left completely untouched.

Pass `fonts` to supply real font file bytes (TTF/OTF/WOFF) keyed by a display's `style.fontFamily`:

```ts
const arialBuffer = await fetch('/fonts/arial.ttf').then(r => r.arrayBuffer());
renderXcsFile(buffer, variables, values, { Arial: arialBuffer });
```

Any `fontFamily` not present in `fonts` falls back to a bundled default (Arimo, Apache-2.0, metric-compatible with Arial) — so the fix works out of the box with no font files required, just with shapes drawn from Arimo rather than the exact requested typeface.

**Known limitation:** `renderXcsFile` only reproduces straight horizontal-baseline layout when substituting into an *existing* TEXT display. xTool Studio's `style.curveX`/`curveY` curved-text formula is undocumented and can't be reverse-decoded from a file alone, so a curved display's substituted text gets correctly-shaped glyphs laid out straight instead of on the original curve. This doesn't apply to the *building* API below — there, you supply the curve angle yourself (see `layoutCurvedGlyphText`), so there's nothing to decode.

### `XcsVariable`

```ts
interface XcsVariable {
  token: string;        // token name without braces, e.g. "LastName"
  defaultValue?: string;
}
```

### `.xs` (v2 workspace) format

### `assertXsFormat(buffer: ArrayBuffer): void`

Validates that `buffer` is a ZIP archive with a `.format` entry equal to `"v2"` and a `project.json` entry. Throws a descriptive error otherwise.

### `extractXsTokens(buffer: ArrayBuffer): string[]`

Same as `extractXcsTokens`, but scans every `canvases/<canvasId>/displays-<chunkIndex>.json` chunk across the archive instead of a single `canvas` array.

### `renderXsFile(buffer, variables, values, fonts?): Uint8Array`

Same substitution and glyph-regeneration behavior as `renderXcsFile` (see above — including the same `fonts` parameter and curved-text limitation), applied to every displays chunk. Returns a re-zipped `.xs` archive; every entry other than the modified displays chunks is passed through byte-for-byte unchanged.

### `loadFont(buffer: ArrayBuffer)` / `loadDefaultFont()` / `layoutText(font, text, originX, originY)`

Lower-level glyph-extraction primitives everything else in this library is built on, exported for direct use. See `src/glyphs.ts` for the exact xTool JSON conventions these were reverse-engineered against.

### Building (`src/builder.ts`, `src/layout.ts`)

`createXCS(deviceId?)` / `new XCSGenerator(options?)` — starts a new project (one canvas, one default layer). Chainable methods:

| Method | Adds |
|--------|------|
| `.addText(text, x, y, options?)` | A `TEXT` display. Pass `options.layout` (see below) for real glyph outlines — without it, text renders as placeholder blocks in xTool Studio. |
| `.addPath(pathData, x, y, width, height, options?)` | A `PATH` display from SVG path data. |
| `.addBitmap(pngBase64, x, y, widthMm, heightMm, originWidthPx, originHeightPx, options?)` | An embedded PNG, physically sized in mm. |
| `.addLayer(color, name, order)` | A named, colored layer (one `#00befe` "Cyan" layer exists by default). |

Then `.generate()` (the plain `XCSFile` object), `.toJSON()` (string), or `.toBytes()` (`Uint8Array`, matching `renderXcsFile`'s output type).

Text layout — build the `layout` option for `.addText()` with one of:

| Function | Layout |
|----------|--------|
| `layoutGlyphText(font, text, emSizeMm, xMm, yMm, letterSpacingMm?)` | Single-line, straight, anchored so the ink box's top-left lands at `(xMm, yMm)`. |
| `layoutMultilineGlyphText(font, text, emSizeMm, letterSpacingMm, lineHeightMult, align)` | Multi-line (`\n`-separated), straight, each line aligned and vertically stacked. |
| `layoutCurvedGlyphText(font, text, emSizeMm, curveDeg, boxWidthMm, boxHeightMm, align?, letterSpacingMm?)` | Single-line, curved along an arc spanning `curveDeg` degrees across a `boxWidthMm`-wide box (positive arches the apex upward, negative bows it downward — same convention as SVG `<textPath>`/canvas curved-text editors). Multi-line curved text isn't supported (matches typical curved-text editors, which also flatten multi-line curved text to one line). **Not yet visually verified against real xTool Studio rendering** (there's no way to check outside the application itself) — the geometry is self-consistent and unit-tested, but treat curved output as best-effort until you've spot-checked it. |

All three return `GlyphTextLayout | null` (`null` for empty/whitespace-only text). `translateGlyphLayout(layout, dxMm, dyMm)` cheaply shifts an already-built layout without relaying out the font.

## Development

```bash
pnpm install     # install dev dependencies
pnpm build       # compile → dist/ (ESM + CJS + .d.ts)
pnpm dev         # watch mode — rebuilds on save
pnpm test        # run tests with vitest
npx tsc --noEmit # type-check without emitting
```

Output files after `pnpm build`:

| File | Format |
|------|--------|
| `dist/index.js` | ESM |
| `dist/index.cjs` | CommonJS |
| `dist/index.d.ts` | TypeScript declarations |

### Releasing

Publishing to npm is automated. Bump the version in `package.json`, add a
`CHANGELOG.md` entry, then create a GitHub release tagged `vX.Y.Z` — the
[publish workflow](.github/workflows/publish.yml) checks the tag against
`package.json`, rebuilds, runs the tests, and publishes with provenance.
It needs an `NPM_TOKEN` repository secret with publish rights.

## Notes

- All inputs and outputs use plain browser-compatible types (`ArrayBuffer`, `Uint8Array`, `string`) — no Node.js APIs, no DOM, no framework required. (`atob`/`crypto.randomUUID` are used for the bundled font and glyph IDs; both are available in browsers and Node ≥ 19.)
- Only `TEXT` display objects are modified during substitution. Geometry, bitmaps, device configuration, and all other fields pass through unchanged.
- This library targets the current xTool Creative Space JSON/`.xs` formats. Older versions of the software may export a different structure.
- `.xs` archives are read and re-written with [fflate](https://github.com/101arrowz/fflate); large `PATH` displays' vector data may be deduplicated into a separate `vectors/<bucketType>/` store rather than inlined — this library never touches `PATH` displays, so that structure round-trips untouched.
- Glyph outline extraction is powered by [opentype.js](https://github.com/opentypejs/opentype.js). The bundled fallback font is [Arimo](https://fonts.google.com/specimen/Arimo) v5.2.8 via [`@fontsource/arimo`](https://www.npmjs.com/package/@fontsource/arimo) (Apache License 2.0, see `third_party/arimo/LICENSE`).

## License

[MIT](LICENSE). The bundled Arimo fallback font is separately licensed under Apache-2.0 (`third_party/arimo/LICENSE`).

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

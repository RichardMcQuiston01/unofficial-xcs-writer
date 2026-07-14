# unofficial-xcs-writer

A framework-agnostic TypeScript library for reading, writing, and applying variable substitution to `.xcs` files produced by [xTool Creative Space](https://www.xtool.com/pages/software). Not affiliated with xTool.

## What is an XCS file?

An `.xcs` file is a plain UTF-8 JSON document exported by xTool Creative Space. It describes a laser project — canvas dimensions, design objects (shapes, text, images), layer assignments, and device parameters. This library lets you:

- **Read** an XCS file and inspect its contents
- **Extract** `{{token}}` template placeholders from text objects
- **Render** a filled-in copy by substituting values for those placeholders

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

**Known limitation:** only straight horizontal-baseline layout is reproduced. xTool Studio's `style.curveX`/`curveY` curved-text layout formula is undocumented and isn't replicated — substituted text on a curved TEXT display gets correctly-shaped glyphs laid out on a straight line instead of the original curve.

### `XcsVariable`

```ts
interface XcsVariable {
  token: string;        // token name without braces, e.g. "LastName"
  defaultValue?: string;
}
```

### `loadFont(buffer: ArrayBuffer)` / `loadDefaultFont()` / `layoutText(font, text, originX, originY)`

Lower-level glyph-extraction primitives `renderXcsFile` is built on, exported for direct use (e.g. building a `TEXT` display from scratch). See `src/glyphs.ts` for the exact xTool JSON conventions these were reverse-engineered against.

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

## Notes

- All inputs and outputs use plain browser-compatible types (`ArrayBuffer`, `Uint8Array`, `string`) — no Node.js APIs, no DOM, no framework required. (`atob`/`crypto.randomUUID` are used for the bundled font and glyph IDs; both are available in browsers and Node ≥ 19.)
- Only `TEXT` display objects are modified during substitution. Geometry, bitmaps, device configuration, and all other fields pass through unchanged.
- This library targets the current xTool Creative Space JSON format. Older versions of the software may export a different structure.
- Glyph outline extraction is powered by [opentype.js](https://github.com/opentypejs/opentype.js). The bundled fallback font is [Arimo](https://fonts.google.com/specimen/Arimo) v5.2.8 via [`@fontsource/arimo`](https://www.npmjs.com/package/@fontsource/arimo) (Apache License 2.0, see `third_party/arimo/LICENSE`).

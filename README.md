# unofficial-xcs-writer

> **Disclaimer:** This is an unofficial, community-built library. It is not affiliated with, endorsed by, or sponsored by xTool in any way.

A framework-agnostic TypeScript library for reading, writing, building, and applying variable substitution to `.xcs` and `.xs` files produced by xTool Creative Space.

## What is an XCS / XS file?

An `.xcs` file is a plain UTF-8 JSON document exported by xTool Creative Space. It describes a laser project — canvas dimensions, design objects (shapes, text, images), layer assignments, and device parameters.

Starting with xTool Studio v1.7, new projects are saved as `.xs` instead — a ZIP archive of several JSON files (project metadata, per-canvas display chunks, processing profiles, device bindings, and binary resources as real files rather than inline base64). `.xcs` is now legacy: v1.7+ can still open `.xcs` files but can no longer save back to that format. See `src/xs.ts` for the full format writeup.

This library lets you, for both formats:

- **Read** a file and inspect its contents
- **Extract** `{{token}}` template placeholders from text objects
- **Render** a filled-in copy by substituting values for those placeholders
- **Build** a new project from scratch — text (straight, multi-line, or curved), paths, and embedded images — and export it as either `.xcs` or `.xs`

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
  .addPath('M0 0L10 0L10 10L0 10Z', 0, 60, 10, 10, {
    // Only affects .toXsBytes() output -- see below.
    processing: { processingType: 'VECTOR_CUTTING', values: { power: 80, speed: 10 } },
  })
  .toBytes(); // Uint8Array, ready to write to a .xcs file
```

Call `.toXsBytes()` instead of `.toBytes()` to export the same project as a `.xs` (v2 workspace)
archive — same chainable builder, same display objects, different container.

Pass `processing: { processingType, values }` to `.addText()`/`.addPath()`/`.addBitmap()`'s
options to set that display's power/speed/etc. in the exported `.xs` file's `profiles.json` +
device bindings — `.xcs` output (`.toBytes()`) ignores this option; its own per-display
processing format is different and not supported yet. Displays given identical settings share
one profile/binding automatically. `processingType`/`values`' exact shape is xTool Studio's own
and undocumented beyond real exports — see `xs_samples/*.xs`'s `profiles.json` for examples
(`VECTOR_ENGRAVING`, `VECTOR_CUTTING`, `FILL_VECTOR_ENGRAVING`). Displays with no `processing`
option behave as before: a generated `.xs` file's power/speed may need to be set manually in
xTool Studio before cutting/engraving.

`createXCS('P2S')`'s argument (and `XCSGeneratorOptions.deviceId`) accepts a known machine name
from `XTOOL_MACHINES` — currently 13 machines verified from real exports in this repo (`"P2S"`,
`"F2 Ultra UV"`, `"S1"`, `"P3"`, `"M2"`, `"F2"`, `"F2 Ultra (Single)"`, `"F2 Ultra"`,
`"M1 Ultra"`, `"F1"`, `"F1 Lite"`, `"F1 Ultra"`, `"MetalFab"`) — and resolves the real
`extId`/`extName`/`deviceCode` (`.xs` only)/default power for that machine, instead of reusing
whatever string you pass for all of them. Export the same design for multiple machines by
building it once and calling `.toXsBytes()`/`.toBytes()` once per `createXCS(machineName)`:

```ts
import { createXCS, XTOOL_MACHINES } from '@richardmcquiston01/unofficial-xcs-writer';

for (const machine of Object.keys(XTOOL_MACHINES)) {
  const bytes = createXCS(machine).addPath('M0 0L10 0L10 10L0 10Z', 0, 0, 10, 10).toXsBytes();
  // write `bytes` to e.g. `design-${machine}.xs`
}
```

A device id not in the catalog still works exactly as before (no `.xs` `deviceCode`, `extId`/
`extName`/`device.id` all set to that string, default power `55`); you can also pass a
`MachineProfile` object directly for a machine not yet in the catalog.

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## API

See [API.md](./API.md) for the full API reference — function signatures, options, types, and important behavior notes (glyph regeneration, curved-text limitations, machine catalog usage, etc.).

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
- This library targets the current xTool Creative Space JSON/`.xs` formats. Older versions of the software may export a different structure.
- `.xs` archives are read and re-written with [fflate](https://github.com/101arrowz/fflate); large `PATH` displays' vector data may be deduplicated into a separate `vectors/<bucketType>/` store rather than inlined — this library never touches `PATH` displays, so that structure round-trips untouched.
- Glyph outline extraction is powered by [opentype.js](https://github.com/opentypejs/opentype.js). The bundled fallback font is [Arimo](https://fonts.google.com/specimen/Arimo) v5.2.8 via [`@fontsource/arimo`](https://www.npmjs.com/package/@fontsource/arimo) (Apache License 2.0, see `third_party/arimo/LICENSE`).

## License

[MIT](LICENSE). The bundled Arimo fallback font is separately licensed under Apache-2.0 (`third_party/arimo/LICENSE`).

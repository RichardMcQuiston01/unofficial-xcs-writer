# unofficial-xcs-writer

> **Disclaimer:** Unofficial, community-built library. Not affiliated with, endorsed by, or sponsored by xTool or Makeblock.

A framework-agnostic TypeScript library for reading, building, and templating xTool project files (`.xcs` and `.xs`). It has no DOM or Node.js dependencies, so it runs in browsers and Node.js alike.

## Features

- **Extract** `{{token}}` placeholders from text objects.
- **Render** filled-in copies by substituting values for those tokens. Substituted text gets freshly generated glyph outlines instead of stale ones.
- **Build** projects from scratch with straight, multi-line, or curved text, paths, and bitmaps. Export as `.xcs` or `.xs`.
- **Target machines** from a catalog of 13 xTool devices, verified from real exports.
- **Set processing profiles** (power, speed, etc.) per display in `.xs` output.

## File formats

| Format | Container | Notes |
|--------|-----------|-------|
| `.xcs` | Plain UTF-8 JSON | Legacy. xTool Studio v1.7+ can open but no longer saves it. |
| `.xs` (v2) | ZIP of JSON files and resources | Default since xTool Studio v1.7. |

Both formats share the same `TEXT` display schema, so substitution works the same way on each.

## Installation

```bash
npm install @richardmcquiston01/unofficial-xcs-writer
# or
pnpm add @richardmcquiston01/unofficial-xcs-writer
```

## Quick start

### Fill in a template

```ts
import {
  assertXcsFormat,
  extractXcsTokens,
  renderXcsFile,
} from '@richardmcquiston01/unofficial-xcs-writer';
import type { XcsVariable } from '@richardmcquiston01/unofficial-xcs-writer';

const buffer: ArrayBuffer = await fetch('/templates/name-tag.xcs').then((r) => r.arrayBuffer());

assertXcsFormat(buffer); // throws a descriptive error if invalid
const tokens: string[] = extractXcsTokens(buffer); // ['FirstName', 'LastName']

const variables: XcsVariable[] = [{ token: 'FirstName', defaultValue: 'Guest' }, { token: 'LastName' }];
const values: Record<string, string> = { FirstName: 'Jane', LastName: 'Smith' };

const output: Uint8Array = renderXcsFile(buffer, variables, values);
```

`.xs` files use the same flow with `assertXsFormat`, `extractXsTokens`, and `renderXsFile`. Every archive entry other than the modified display chunks passes through byte-for-byte unchanged.

### Build a project

```ts
import {
  createXCS,
  loadDefaultFont,
  layoutGlyphText,
  layoutCurvedGlyphText,
} from '@richardmcquiston01/unofficial-xcs-writer';

const font = loadDefaultFont();

const bytes: Uint8Array = createXCS('P2S')
  .addText('Hello', 10, 10, {
    fontFamily: 'Arial',
    fontSize: 24,
    layout: layoutGlyphText(font, 'Hello', 8, 10, 10),
  })
  .addText('Arch Text', 0, 40, {
    fontFamily: 'Arial',
    fontSize: 18,
    layout: layoutCurvedGlyphText(font, 'Arch Text', 6, 90, 60, 20, 'center'),
  })
  .addPath('M0 0L10 0L10 10L0 10Z', 0, 60, 10, 10, {
    processing: { processingType: 'VECTOR_CUTTING', values: { power: 80, speed: 10 } },
  })
  .toXsBytes(); // or .toBytes() for .xcs
```

Notes:

- Text needs a glyph `layout` so xTool Studio renders real outlines rather than placeholder blocks.
- `processing` is applied to `.xs` output only. Displays with identical settings share one profile.
- Processing values are unvalidated. Check power and speed in xTool Studio before cutting.

### Target a machine

`createXCS` accepts a machine name from `XTOOL_MACHINES`, a `MachineProfile` object, or a raw device id string.

```ts
import { createXCS, XTOOL_MACHINES } from '@richardmcquiston01/unofficial-xcs-writer';

for (const machine of Object.keys(XTOOL_MACHINES)) {
  const bytes: Uint8Array = createXCS(machine)
    .addPath('M0 0L10 0L10 10L0 10Z', 0, 0, 10, 10)
    .toXsBytes();
}
```

Supported machines: P2S, P3, S1, M2, M1 Ultra, F1, F1 Lite, F1 Ultra, F2, F2 Ultra, F2 Ultra (Single), F2 Ultra UV, MetalFab.

## Documentation

See [API.md](./API.md) for the full reference: signatures, options, types, and behavior notes. Release history is in [CHANGELOG.md](./CHANGELOG.md).

## Known limitations

- Substituting text on an already-curved `TEXT` display lays the new text out straight.
- Curved text built from scratch is not verified against real xTool Studio rendering.
- Multi-line curved text is not supported.
- `.xcs` output has no processing-profile support.

## Development

```bash
pnpm install      # install dependencies
pnpm build        # tsup -> dist/ (ESM + CJS + .d.ts)
pnpm dev          # watch mode
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
```

## Support

If this library has helped you, please consider donating to offset development and AI credit costs.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

## Credits and license

[MIT](LICENSE). Glyph extraction uses [opentype.js](https://github.com/opentypejs/opentype.js) and `.xs` archives use [fflate](https://github.com/101arrowz/fflate). The bundled fallback font is [Arimo](https://fonts.google.com/specimen/Arimo) v5.2.8 (Apache-2.0, see `third_party/arimo/LICENSE`).

(c) 2026 Richard McQuiston

xTool, xTool Studio, and xTool Creative Space are trademarks of Makeblock Co., Ltd.

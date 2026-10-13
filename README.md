# unofficial-xcs-writer

- Author: [Richard McQuiston](mailto:richard.mcquiston@gmail.com)
- Website: https://richardmcquiston.com/

> **Disclaimer:** This is an unofficial, community-built library. It is not affiliated with, endorsed by, or sponsored by xTool or Makeblock.

## Table of Contents

| [Overview](#overview) | [Features](#features) | [Getting Started](#getting-started) | [Supported Machines](#supported-machines) | [Known Limitations](#known-limitations) | [More Information](#more-information) | [Development](#development) | [Buy Me a Coffee](#buy-me-a-coffee) | [License](#license) | [Copyright](#copyright) |

## Overview

This is a TypeScript library for xTool project files. It reads, builds, and fills in templates for `.xcs` and `.xs` files.

An `.xcs` file is plain JSON. An `.xs` file is a ZIP archive of JSON files. xTool Studio 1.7 and newer saves `.xs` by default. It can still open `.xcs` files but can no longer save them.

The library uses no framework, no DOM, and no Node.js-only features. It works in browsers and in Node.js.

[Back to Top](#table-of-contents)

## Features

- Find `{{token}}` placeholders in text objects.
- Fill in the placeholders with your own values. The library draws new glyph outlines for the changed text.
- Build a project from scratch. You can add straight, multi-line, or curved text, paths, and images.
- Save the project as `.xcs` or `.xs`.
- Pick a target machine from a list of 13 xTool devices.
- Set power and speed for each object in `.xs` output.

[Back to Top](#table-of-contents)

## Getting Started

### Prerequisites

- Node.js 19 or newer, or a current web browser.
- A package manager such as npm or pnpm.

### Installation

```bash
npm install @richardmcquiston01/unofficial-xcs-writer
# or
pnpm add @richardmcquiston01/unofficial-xcs-writer
```

### Usage

To fill in a template, follow these steps:

1. Load the file as an `ArrayBuffer`.
2. Check the format with `assertXcsFormat`. It throws an error if the file is not valid.
3. List the placeholders with `extractXcsTokens`.
4. Call `renderXcsFile` with your values.

For `.xs` files, use `assertXsFormat`, `extractXsTokens`, and `renderXsFile`. They work the same way.

To build a project, call `createXCS` with a machine name. Add objects with `.addText()`, `.addPath()`, and `.addBitmap()`. Finish with `.toBytes()` for `.xcs` or `.toXsBytes()` for `.xs`.

### Examples

Fill in a template:

```ts
import {
  assertXcsFormat,
  extractXcsTokens,
  renderXcsFile,
} from '@richardmcquiston01/unofficial-xcs-writer';
import type { XcsVariable } from '@richardmcquiston01/unofficial-xcs-writer';

const buffer: ArrayBuffer = await fetch('/templates/name-tag.xcs').then((r) => r.arrayBuffer());

assertXcsFormat(buffer);
const tokens: string[] = extractXcsTokens(buffer); // ['FirstName', 'LastName']

const variables: XcsVariable[] = [
  { token: 'FirstName', defaultValue: 'Guest' },
  { token: 'LastName' },
];
const values: Record<string, string> = { FirstName: 'Jane', LastName: 'Smith' };

const output: Uint8Array = renderXcsFile(buffer, variables, values);
```

Build a project from scratch:

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
  .toXsBytes();
```

Keep these points in mind:

- Text needs a glyph `layout`. Without one, xTool Studio shows placeholder blocks instead of real letters.
- The `processing` option only changes `.xs` output. Objects with the same settings share one profile.
- The library does not check the processing values. Confirm power and speed in xTool Studio before you cut.

[Back to Top](#table-of-contents)

## Supported Machines

Pass one of these names to `createXCS`. The library then uses the real device ids and default power for that machine.

| | | | |
|---|---|---|---|
| P2S | P3 | S1 | M2 |
| M1 Ultra | F1 | F1 Lite | F1 Ultra |
| F2 | F2 Ultra | F2 Ultra (Single) | F2 Ultra UV |
| MetalFab | | | |

You can also pass a `MachineProfile` object or a plain device id string. A plain string still works, but it gets default values. To export one design for every machine, loop over `Object.keys(XTOOL_MACHINES)`.

[Back to Top](#table-of-contents)

## Known Limitations

- New text on an already curved text object is laid out straight.
- Curved text built from scratch has not been checked against real xTool Studio output.
- Multi-line curved text is not supported.
- `.xcs` output has no processing-profile support.

[Back to Top](#table-of-contents)

## More Information

- [API.md](./API.md) lists every function, option, and type.
- [CHANGELOG.md](./CHANGELOG.md) lists changes for each release.

[Back to Top](#table-of-contents)

## Development

```bash
pnpm install      # install dependencies
pnpm build        # build to dist/ (ESM, CJS, and type files)
pnpm dev          # rebuild on every save
pnpm test         # run the tests
pnpm typecheck    # check types without building
```

The library uses [opentype.js](https://github.com/opentypejs/opentype.js) to read glyph outlines and [fflate](https://github.com/101arrowz/fflate) to read and write ZIP archives. The built-in fallback font is [Arimo](https://fonts.google.com/specimen/Arimo) version 5.2.8, under the Apache 2 license. Its license text is in `third_party/arimo/LICENSE`.

[Back to Top](#table-of-contents)

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

[Back to Top](#table-of-contents)

## License

MIT. See [LICENSE](./LICENSE). The bundled Arimo font uses the Apache 2 license.

[Back to Top](#table-of-contents)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.

xTool, xTool Studio, and xTool Creative Space are trademarks of Makeblock Co., Ltd. This project is not affiliated with, endorsed by, or sponsored by Makeblock Co., Ltd. or xTool.

[Back to Top](#table-of-contents)

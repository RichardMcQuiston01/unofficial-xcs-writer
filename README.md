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

### `renderXcsFile(buffer, variables, values): Uint8Array`

Applies substitution to every `TEXT` display object and returns the modified file encoded as a UTF-8 `Uint8Array`. Tokens with no matching entry in `values` fall back to `variable.defaultValue`, or an empty string if no default is set.

### `XcsVariable`

```ts
interface XcsVariable {
  token: string;        // token name without braces, e.g. "LastName"
  defaultValue?: string;
}
```

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

- All inputs and outputs use plain browser-compatible types (`ArrayBuffer`, `Uint8Array`, `string`) — no Node.js APIs, no DOM, no framework required.
- Only `TEXT` display objects are modified during substitution. Geometry, bitmaps, device configuration, and all other fields pass through unchanged.
- This library targets the current xTool Creative Space JSON format. Older versions of the software may export a different structure.

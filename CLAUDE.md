# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Standalone, framework-agnostic TypeScript library for reading, writing, and applying variable
substitution to `.xcs` (xTool Creative Space) ZIP archives. Not affiliated with xTool.

Intended for NPM publication as `unofficial-xcs-writer` and use as a submodule inside
`laser-template-builder`, following the same pattern that `laser-template-builder` uses as a
submodule inside `maker-template-pro`.

## Ecosystem Relationship

| Repo | Role |
|------|------|
| `maker-template-pro` (`D:\www\maker-template-pro`) | CrafterKit monorepo — top-level host |
| `laser-template-builder` (`D:\www\laser-template-builder`) | Template editor package — will consume this library |
| `unofficial-xcs-writer` (this repo) | XCS I/O library — standalone, no framework deps |

The XCS functions currently living in `laser-template-builder/src/lib/formats/xcs.ts` will
eventually be removed from that package and replaced with a dependency on this one.

## XCS File Format

**`.xcs` files are plain UTF-8 JSON** — not ZIP archives. The root object contains:

```
{
  "canvasId": "uuid",
  "canvas": [ { "displays": [...], "layerData": {...}, ... } ],
  "device": { ... },
  "version": "x.y.z",
  "cover": "data:image/png;base64,..."   ← thumbnail
}
```

`canvas[*].displays` is an array of design objects. The only display type that carries
user-visible text (and thus template tokens) is `type: "TEXT"`, which has a `text` string field.
`BITMAP` displays embed image data inline as `base64: "data:image/png;base64,..."`.
Other types (`RECT`, `CIRCLE`, `PATH`, `REGULAR_POLYGON`) hold geometry only.

Token format: `{{tokenName}}` — appear exclusively in `TEXT` display `text` fields.

> **Note:** The existing `crafterkit/src/lib/formats/xcs.ts` incorrectly treats XCS files as
> ZIP archives (using jszip). That code pre-dates the format investigation and will be replaced.
> The "Can't find end of central directory" error is jszip failing on a plain JSON file.

## Core API (`src/xcs.ts`)

All functions accept plain `ArrayBuffer` and return browser-compatible types. No framework deps.

| Function | Signature | Description |
|----------|-----------|-------------|
| `assertXcsFormat` | `(buffer: ArrayBuffer): void` | Validates the buffer is parseable XCS JSON with a `canvas` array; throws a descriptive error otherwise |
| `readXcsFile` | `(buffer: ArrayBuffer): string` | Decodes the buffer and returns the raw JSON string |
| `extractXcsTokens` | `(buffer: ArrayBuffer): string[]` | Returns unique token names (without braces) from all TEXT displays across all canvases |
| `renderXcsFile` | `(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>): Uint8Array` | Substitutes tokens in TEXT displays and returns the modified file as a UTF-8 Uint8Array |

`XcsVariable`: `{ token: string; defaultValue?: string }` — `token` is the name without braces.

## Build Tooling

`tsup` — outputs ESM + CJS + `.d.ts`. No runtime dependencies; `tsup`, `typescript`, and `vitest`
are the only devDependencies.

`package.json` exports map lists `types` before `import`/`require`:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Commands

```bash
pnpm install          # install dependencies
pnpm build            # tsup → dist/
pnpm dev              # tsup --watch (rebuild on save)
npx tsc --noEmit      # type-check without emitting
pnpm test             # vitest run
pnpm test <file>      # run a single test file
```

## Sample Files

`xcs_samples/` contains four real xTool Creative Space exports used for format investigation and
manual testing. Each has a matching `.png` screenshot showing how it looks in xTool Studio.

- `SVGImage.xcs` — contains one `{{LastName}}` token in a TEXT display; use for token extraction smoke tests
- `TextElements.xcs` — three TEXT displays with literal text (no tokens), plus many PATH objects
- `Shapes.xcs` — basic geometry only (RECT, CIRCLE, REGULAR_POLYGON), no text
- `ImageAndCut.xcs` — BITMAP displays with large embedded base64 PNG data

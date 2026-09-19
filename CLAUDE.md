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
| `renderXcsFile` | `(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>, fonts?: Record<string, ArrayBuffer>): Uint8Array` | Substitutes tokens in TEXT displays and returns the modified file as a UTF-8 Uint8Array. Whenever a display's text changes, its `charJSONs`/`fontData.glyphData` are regenerated with real glyph outlines (see `src/glyphs.ts`) instead of xTool Studio silently reusing whatever stale glyph shapes were already on disk. `fonts` supplies real font bytes keyed by `style.fontFamily`; unsupplied families fall back to a bundled default (Arimo, Apache-2.0, metric-compatible with Arial). |

`XcsVariable`: `{ token: string; defaultValue?: string }` — `token` is the name without braces.

## Glyph Extraction (`src/glyphs.ts`)

Real per-character glyph outline extraction, powered by `opentype.js`. Exported directly too
(`loadFont`, `loadDefaultFont`, `layoutText`) for anyone building a TEXT display from scratch,
e.g. a future XCS *generation* API. The exact xTool Studio JSON conventions (scale, Y-axis
direction per field, how `charJSONs[i].x/y` relates to the display's own `x`/`y`) were reverse-
engineered by diffing a generated file against xTool Studio re-saves — see the module's own
doc comment for the full writeup, including the known curved-text (`style.curveX`/`curveY`)
limitation: only straight horizontal-baseline layout is reproduced.

The bundled fallback font is `@fontsource/arimo` v5.2.8, Apache License 2.0, embedded as a base64
string in `src/assets/arimo-regular.ts`; the license text ships in `third_party/arimo/LICENSE`
and is included in the published npm package via `package.json`'s `files` field.

## Build Tooling

`tsup` — outputs ESM + CJS + `.d.ts`. Runtime dependency: `opentype.js` (glyph outline parsing).
`tsup`, `typescript`, `vitest`, and `@types/opentype.js` are the devDependencies.

**Import gotcha:** `opentype.js` is a CJS-only UMD build with no `exports` map in its
`package.json`. `import * as opentype from 'opentype.js'` leaves named properties like `.parse`
undefined at runtime in built ESM output (Node's CJS/ESM interop can't reliably detect named
exports from a dynamically-constructed `module.exports`). Use the default import instead:
`import opentype from 'opentype.js'`, then `opentype.parse(...)`. Type-only imports
(`import type * as opentype from 'opentype.js'`) are unaffected since they're fully erased.

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

## Generation API (`src/builder.ts`, `src/layout.ts`)

`XCSGenerator`/`createXCS` build a project from scratch (canvas, layers, TEXT/PATH/BITMAP
displays) — ported from `maker-toolkit`'s `apps/desktop/src/shared/xcs/generator.ts` (see that
repo's `planning/ROADMAP.md` "XCS generator consolidation" note), which previously duplicated
this. `apps/desktop`'s own copy still exists unchanged as of this port; migrating it to depend
on this package (once this package is merged and released) is a planned follow-up, not done yet.

`src/layout.ts` builds on `glyphs.ts`'s straight, fixed-em `layoutText` to produce real-world,
positioned `GlyphTextLayout`s for `.addText()`: `layoutGlyphText` (single line),
`layoutMultilineGlyphText` (stacked lines), and `layoutCurvedGlyphText` (single line along a
circular arc — new; see below).

## Open Issues

- **Curved-text substitution.** `renderXcsFile`'s glyph regeneration (existing-file
  substitution) still can't reproduce `style.curveX`/`curveY` — see `src/glyphs.ts`'s doc
  comment. The angle isn't recoverable from an existing file without decoding that undocumented
  formula, so substituted text on an already-curved TEXT display still lays out straight. This
  is different from the *building* API: there, the caller supplies the curve angle directly
  (`layoutCurvedGlyphText`), so there's nothing to decode — building curved text from scratch
  works today.
- **Curved-text fidelity is unverified.** `layoutCurvedGlyphText` bakes each character's
  rotated position/shape directly (mirroring how substitution already bakes real glyph shapes
  rather than relying on xTool Studio to reshape anything), using the same arc-geometry
  convention as SVG `<textPath>`/canvas curved-text editors. The math is internally
  self-consistent and unit-tested (`src/layout.test.ts` checks every character lands on the
  expected circle), but there's no way to verify visual fidelity against real xTool Studio
  rendering outside the application itself — treat it as best-effort until spot-checked.
- **Multi-line curved text** is not supported (single line only) — this matches typical
  curved-text editors' own behavior (multi-line curved text is usually flattened to one line
  too), not a gap specific to this library.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Standalone, framework-agnostic TypeScript library for reading, writing, and applying variable
substitution to `.xcs` and `.xs` (xTool Creative Space) files. Not affiliated with xTool.

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

## XS File Format (v2)

**`.xs` files ARE ZIP archives** (unlike `.xcs`, above). Starting with xTool Studio v1.7, new
projects default to `.xs` instead of `.xcs`; `.xcs` is now legacy — v1.7+ can still open `.xcs`
files but can no longer save back to that format
([support article](https://support.xtool.com/article/3386), which gives no technical detail —
the structure below was reverse-engineered directly from real v1.7.30 exports).

Archive contents:

```
.format                                          ← literal "v2"
project.json                                     ← project metadata (replaces .xcs's root
                                                    canvasId/device/version/cover fields)
profiles.json                                    ← processing profiles (power/speed/etc. by
                                                    processingType) — no .xcs equivalent
canvases/<canvasId>.json                         ← per-canvas metadata (layerData, groupData,
                                                    chunkLayout)
canvases/<canvasId>/displays-<chunkIndex>.json   ← { canvasId, chunkIndex, displays: [...] } —
                                                    a canvas's displays may span >1 chunk file
devices/device-<deviceId>.json                   ← device + per-canvas profile bindings — no
                                                    .xcs equivalent
vectors/<bucketType>/index.json                  ← content-addressed store: hash → byte size
vectors/<bucketType>/data-<n>.json               ← hash → deduplicated field value (see below)
resources/<file>                                 ← binary assets (e.g. the cover thumbnail) as
resources/<file>.meta.json                          real files, each with a sibling metadata file
                                                    — .xcs embeds these as base64 data URIs instead
```

**The `TEXT` display schema itself is unchanged from `.xcs`** — `text`, `style`, `fontData`,
`charJSONs` all have the exact same shape (confirmed by diffing a hand-authored `.xs` file's
TEXT display against the `.xcs` format documented in `src/glyphs.ts`). This is why
`src/substitution.ts` exists: the actual token-substitution/glyph-regeneration logic is
identical between formats, only the container differs.

**`PATH` display vector deduplication:** a large `dPath` value may be extracted out-of-line into
`vectors/<bucketType>/` (observed with `bucketType: "svg"`), keyed by its SHA-256-shaped hash.
When this happens, the display has `vectorRef: { vectorHash, bucketType, originalField: "dPath" }`
instead of an inline `dPath`. Short paths keep `dPath` inline as before. `src/xs.ts` never reads
or writes `PATH` displays, so this structure always round-trips as-is, untouched.

## Core API (`src/xcs.ts`, `src/xs.ts`, `src/substitution.ts`)

All functions accept plain `ArrayBuffer` and return browser-compatible types. No framework deps.

`src/substitution.ts` holds the format-agnostic logic shared by both formats' `renderXxxFile`/
`extractXxxTokens` (operating on a plain `XcsDisplay[]`): `collectTextTokens` and
`substituteTextDisplays`. `xcs.ts` calls these once per canvas; `xs.ts` calls them once per
`displays-<chunkIndex>.json` chunk.

| Function | Signature | Description |
|----------|-----------|-------------|
| `assertXcsFormat` | `(buffer: ArrayBuffer): void` | Validates the buffer is parseable XCS JSON with a `canvas` array; throws a descriptive error otherwise |
| `readXcsFile` | `(buffer: ArrayBuffer): string` | Decodes the buffer and returns the raw JSON string |
| `extractXcsTokens` | `(buffer: ArrayBuffer): string[]` | Returns unique token names (without braces) from all TEXT displays across all canvases |
| `renderXcsFile` | `(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>, fonts?: Record<string, ArrayBuffer>): Uint8Array` | Substitutes tokens in TEXT displays and returns the modified file as a UTF-8 Uint8Array. Whenever a display's text changes, its `charJSONs`/`fontData.glyphData` are regenerated with real glyph outlines (see `src/glyphs.ts`) instead of xTool Studio silently reusing whatever stale glyph shapes were already on disk. `fonts` supplies real font bytes keyed by `style.fontFamily`; unsupplied families fall back to a bundled default (Arimo, Apache-2.0, metric-compatible with Arial). |
| `assertXsFormat` | `(buffer: ArrayBuffer): void` | Validates the buffer is a ZIP with a `.format` entry equal to `"v2"` and a `project.json` entry; throws otherwise |
| `extractXsTokens` | `(buffer: ArrayBuffer): string[]` | Same as `extractXcsTokens`, scanning every `displays-<chunkIndex>.json` chunk instead of a single `canvas` array |
| `renderXsFile` | `(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>, fonts?: Record<string, ArrayBuffer>): Uint8Array` | Same substitution/regeneration behavior as `renderXcsFile`, applied per displays chunk, then re-zipped via `fflate`. Every archive entry other than the modified chunks passes through byte-for-byte unchanged (verified in `src/xs.test.ts`). |

`XcsVariable`: `{ token: string; defaultValue?: string }` — `token` is the name without braces.

There's no `.xs` equivalent to `readXcsFile`: an `.xs` archive has no single JSON document to
decode and return as a string.

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

`tsup` — outputs ESM + CJS + `.d.ts`. Runtime dependencies: `opentype.js` (glyph outline
parsing) and `fflate` (`.xs` ZIP read/write). `tsup`, `typescript`, `vitest`, `@types/opentype.js`,
and `@types/node` (only needed so `src/xs.test.ts` can read sample files from disk) are the
devDependencies.

Unlike `opentype.js` (see the import gotcha below), `fflate` ships a correct `exports` map for
both ESM and CJS, so `import { unzipSync, zipSync } from 'fflate'` works as a normal named
import with no workaround needed.

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

`xs_samples/` contains four real xTool Studio v1.7.30 `.xs` exports, used by `src/xs.test.ts`:

- `EditableText.xs` — one live TEXT display, `"Hello {{Name}}"`; the only sample with an
  unflattened TEXT display (needed to reverse-engineer the format — see "XS File Format" above)
- `MadeWithLoveEngraveable.xs`, `MadeWithLoveScoreAndCut.xs`, `BirthdaySign.xs` — real
  marketplace/purchased designs with their text already flattened to PATH outlines (typical for
  distributed craft files); `BirthdaySign.xs` also exercises the `vectors/svg/` dedup bucket

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

`XCSGenerator.toXsBytes()` (`src/xs.ts`'s `buildXsArchive`, called on the same `generate()`
output as `toBytes()`) exports the built project as a `.xs` v2 archive instead of `.xcs`. Display
objects carry over completely unchanged -- only the container (`project.json`/`profiles.json`/
`devices/`/`canvases/`, see "XS File Format" above) is synthesized fresh, always as a single
canvas in a single `displays-0.json` chunk.

Pass `processing: { processingType, values }` to `.addText()`/`.addPath()`/`.addBitmap()`'s
options to set that display's power/speed/etc. (only `.toXsBytes()` output -- `.xcs`'s per-display
processing format is structurally different and much less documented; `.toBytes()` ignores this
option entirely, see the Open Issue below). Displays that get given the *exact same*
`processingType`+`values` share one `profiles.json` entry and one binding with multiple
`displayIds` (matching how real xTool Studio exports dedupe identical settings -- see
`xs_samples/MadeWithLoveEngraveable.xs`'s `devices/device-*.json`, where one binding covers 13
displays); different settings
each get their own profile+binding. `processingType`/`values`' shape is xTool Studio's own,
undocumented beyond what real exports show -- see `xs_samples/*.xs`'s `profiles.json` for
verified examples (`VECTOR_ENGRAVING`, `FILL_VECTOR_ENGRAVING`, `VECTOR_CUTTING`). Unverified
against the real application, like the curved-text caveats below. When no display has
`processing` set, `profiles.json`/bindings stay empty exactly as before.

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
- **`.xcs` generation has no processing-profile support.** `.addText()`/`.addPath()`/
  `.addBitmap()`'s `processing` option (see "Generation API" above) only affects `.toXsBytes()`
  output. `.xcs` embeds per-display processing data in a much more complex, less-documented
  shape (nested under `device.data.value[canvasId].displays.value[displayId]`, with
  processing-type-specific `customize`/`official` parameter variants) -- only one real sample
  covering two processing types has been examined so far, not enough to implement with
  confidence given the real-world stakes of guessing laser power/speed settings wrong.
  `.toBytes()`'s `device.data.value` stays empty as it always has.
- **`.xs` processing-profile values are unvalidated.** `processing.values`' shape isn't checked
  against `processingType` -- the caller is responsible for matching real xTool Studio field
  names/shapes (see `xs_samples/*.xs`'s `profiles.json`). A generated `.xs` file's displays may
  still need power/speed verified/adjusted in xTool Studio before cutting/engraving; this whole
  feature is unverified against the real application.

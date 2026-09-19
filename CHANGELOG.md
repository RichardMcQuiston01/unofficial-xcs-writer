# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-09-19

### Changed

- Version bump only — 0.4.0 itself was never published to npm (only consumed
  ahead of release via a git dependency from `maker-toolkit`'s `apps/desktop`,
  which pointed at this repo's `dist` branch as a workaround). No code changes
  from 0.4.0; this is the first published release carrying the generation API
  and curved-text layout described below.

## [0.4.0] - 2026-09-19

### Added

- **Generation API** (`src/builder.ts`): `XCSGenerator`/`createXCS` build a `.xcs` project from
  scratch — canvas, layers, and `TEXT`/`PATH`/`BITMAP` displays — ported from `maker-toolkit`'s
  previously-duplicated hand-rolled generator. Chainable `.addText()`/`.addPath()`/
  `.addBitmap()`/`.addLayer()`, then `.generate()`/`.toJSON()`/`.toBytes()`.
- **Curved text layout** (`src/layout.ts`): `layoutCurvedGlyphText` lays a single line of text
  out along a circular arc, baking each character's rotated position and glyph shape directly
  (same approach `renderXcsFile` already uses for straight substituted text — xTool Studio only
  trusts stored glyph shapes). Uses the same arc-geometry convention (chord width, sweep angle,
  up/down sign, align-driven start offset) as SVG `<textPath>`/canvas curved-text editors, so a
  document renders consistently across export formats. Not yet visually verified against real
  xTool Studio output — see `CLAUDE.md`'s "Open Issues".
- `layoutGlyphText`/`layoutMultilineGlyphText`/`translateGlyphLayout`/`fontSizePoints`
  (`src/layout.ts`): the higher-level, real-world-scaled/positioned layout helpers built on
  `glyphs.ts`'s `layoutText`, also ported from `maker-toolkit` (previously duplicated
  consumer-side). `effectiveCurveDeg` clamps/normalizes a curve angle (±355°, treats <1° as
  straight).

### Changed

- README's substitution "Known limitation" note narrowed to `renderXcsFile` specifically — it
  still can't decode an existing curved display's `style.curveX`/`curveY`, but the new building
  API doesn't have that problem (the caller supplies the angle directly).

## [0.3.1] - 2026-08-17

### Changed

- Replaced the ad-hoc PayPal "Support" section in the README with the standard
  "Buy Me a Coffee" donation block (Stripe link plus a scannable QR code at
  `donate.svg`), now the last section of the README.
- `donate.svg` is included in the published tarball so the README's QR image
  resolves for consumers reading it from the package.

## [0.3.0] - 2026-07-14

### Added

- Root `LICENSE` file (MIT) — previously declared in `package.json` but not shipped.
- `prepublishOnly` script that rebuilds and runs the test suite before every
  `npm publish`, preventing stale-`dist/` releases.
- This changelog.

### Fixed

- Republished the glyph outline extraction feature with a correct build. The
  0.2.0 tarball on npm was packed from a stale `dist/` and does not actually
  contain the glyph regeneration code its README describes — use 0.3.0 instead.

## [0.2.0] - 2026-07-14

> **Warning:** the npm tarball for this version was built from a stale `dist/`
> and lacks the glyph extraction feature listed below. Use 0.3.0 or later.

### Added

- Real per-character glyph outline extraction (`src/glyphs.ts`, powered by
  [opentype.js](https://github.com/opentypejs/opentype.js)). When
  `renderXcsFile` changes a TEXT display's text, its `charJSONs` /
  `fontData.glyphData` are regenerated with real glyph outlines so xTool
  Studio renders the substituted text correctly.
- Optional `fonts` parameter on `renderXcsFile` to supply real font bytes
  (TTF/OTF/WOFF) keyed by `style.fontFamily`.
- Bundled fallback font: Arimo v5.2.8 (Apache-2.0, metric-compatible with
  Arial) for families not supplied via `fonts`.
- Lower-level glyph primitives exported for direct use: `loadFont`,
  `loadDefaultFont`, `layoutText`.

### Known limitations

- Curved-text layout (`style.curveX`/`curveY`) is not reproduced —
  substituted text on a curved TEXT display gets correctly-shaped glyphs laid
  out on a straight baseline.

## [0.1.0] - 2026-05-19

### Added

- Initial release: read, validate, and apply `{{token}}` variable
  substitution to xTool Creative Space `.xcs` files.
- Core API: `assertXcsFormat`, `readXcsFile`, `extractXcsTokens`,
  `renderXcsFile`, and the `XcsVariable` type.
- Dual ESM + CJS build with TypeScript declarations via tsup.

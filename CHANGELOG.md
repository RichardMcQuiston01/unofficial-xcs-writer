# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

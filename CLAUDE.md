# CLAUDE.md — unofficial-xcs-writer

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

## Core API

All functions accept/return plain browser-compatible types (`ArrayBuffer`, `Uint8Array`, `string`).
No React, no Next.js, no DOM required.

| Function | Signature | Description |
|----------|-----------|-------------|
| `assertZipMagic` | `(buffer: ArrayBuffer): void` | Validates ZIP magic bytes (`PK\x03\x04`); throws a clear error for non-ZIP input |
| `readXcsArchive` | `(buffer: ArrayBuffer): Promise<{ projectJson: string; assets: Map<string, string \| Uint8Array> }>` | Unpacks the archive — `project.json` as a string, SVG layers as strings, other files as binary |
| `extractXcsTokens` | `(buffer: ArrayBuffer): Promise<string[]>` | Returns all unique `{{token}}` placeholders found in `project.json` and embedded SVG layers |
| `renderXcsFile` | `(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>): Promise<Uint8Array>` | Applies substitution and re-packages as a new ZIP ready for download |

## Key Dependency

- `jszip` — ZIP read/write (already used in `laser-template-builder`)

## Build Tooling

`tsup` — outputs ESM + CJS + `.d.ts`, matching the `laser-template-builder` build pattern.

`package.json` exports map must list `types` before `import`/`require`:

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
pnpm install      # install dependencies
pnpm build        # tsup → dist/
pnpm dev          # tsup --watch (rebuild on save)
npx tsc --noEmit  # type-check without emitting
```

## Open Issues

- XCS import error ("Can't find end of central directory") still reproducible with certain files —
  may indicate a newer xTool Creative Space format variant. Collect a sample file to investigate.
  Magic-byte validation and a clearer error message are already in place in the current
  `laser-template-builder` implementation.

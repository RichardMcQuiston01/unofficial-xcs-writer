import { unzipSync, zipSync } from 'fflate';
import type { XcsVariable, XsDisplaysChunk } from './types.js';
import { collectTextTokens, substituteTextDisplays } from './substitution.js';
import type * as opentype from 'opentype.js';

/**
 * `.xs` is xTool Studio's replacement for `.xcs`, introduced in xTool
 * Studio v1.7 (`.xcs` is now legacy: v1.7+ can still open `.xcs` files
 * but can no longer save back to that format). Unlike `.xcs` (plain
 * UTF-8 JSON), `.xs` is a ZIP archive of several JSON files:
 *
 * - `.format` -- literal `"v2"`.
 * - `project.json` -- project metadata (replaces `.xcs`'s root
 *   `canvasId`/`device`/`version`/`cover` fields).
 * - `canvases/<canvasId>.json` -- per-canvas metadata (`layerData`,
 *   `groupData`, `chunkLayout`).
 * - `canvases/<canvasId>/displays-<chunkIndex>.json` -- the actual
 *   display objects, as `{ canvasId, chunkIndex, displays: [...] }`.
 *   A canvas's displays may be split across more than one chunk file.
 * - `devices/device-<deviceId>.json`, `profiles.json` -- processing
 *   profiles and per-canvas device bindings; no `.xcs` equivalent.
 * - `resources/<file>` (+ sibling `<file>.meta.json`) -- binary assets
 *   (e.g. the cover thumbnail) as real files, not inline base64.
 *
 * The `TEXT` display schema itself (`text`, `style`, `fontData`,
 * `charJSONs`) is unchanged from `.xcs` -- confirmed by diffing a
 * hand-authored `.xs` file's TEXT display against the `.xcs` format
 * documented in src/glyphs.ts. Large `PATH` displays' `dPath` may be
 * deduplicated out-of-line into a content-addressed
 * `vectors/<bucketType>/` store, referenced via a `vectorRef` field
 * instead of an inline `dPath`; this module never touches PATH
 * displays, so that structure is preserved as-is.
 */

const DISPLAYS_CHUNK_RE = /^canvases\/[^/]+\/displays-\d+\.json$/;

function decodeJson<T>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function assertXsFormat(buffer: ArrayBuffer): void {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(buffer));
  } catch (err) {
    throw new Error(`Not a valid .xs file: ${(err as Error).message}`);
  }

  const format = entries['.format'];
  if (!format) {
    throw new Error('Not a valid .xs file: missing .format entry.');
  }
  const formatVersion = new TextDecoder().decode(format).trim();
  if (formatVersion !== 'v2') {
    throw new Error(`Unsupported .xs format version "${formatVersion}" (expected "v2").`);
  }

  if (!entries['project.json']) {
    throw new Error('Not a valid .xs file: missing project.json.');
  }
}

export function extractXsTokens(buffer: ArrayBuffer): string[] {
  const entries = unzipSync(new Uint8Array(buffer));
  const seen = new Set<string>();

  for (const [path, data] of Object.entries(entries)) {
    if (!DISPLAYS_CHUNK_RE.test(path)) continue;
    const chunk = decodeJson<XsDisplaysChunk>(data);
    collectTextTokens(chunk.displays, seen);
  }

  return Array.from(seen);
}

/**
 * Substitutes `{{token}}` placeholders in TEXT display `text` fields
 * across every canvas chunk in an `.xs` archive, regenerating glyph
 * outline data for any display whose text actually changes -- see
 * src/substitution.ts (shared with `renderXcsFile`) for the details.
 */
export function renderXsFile(
  buffer: ArrayBuffer,
  variables: XcsVariable[],
  values: Record<string, string>,
  fonts?: Record<string, ArrayBuffer>
): Uint8Array {
  const entries = unzipSync(new Uint8Array(buffer));
  const fontCache = new Map<string, opentype.Font>();

  for (const [path, data] of Object.entries(entries)) {
    if (!DISPLAYS_CHUNK_RE.test(path)) continue;
    const chunk = decodeJson<XsDisplaysChunk>(data);
    substituteTextDisplays(chunk.displays, variables, values, fonts, fontCache);
    entries[path] = new TextEncoder().encode(JSON.stringify(chunk));
  }

  return zipSync(entries);
}

import { unzipSync, zipSync } from 'fflate';
import type { XcsVariable, XsDisplaysChunk } from './types.js';
import { collectTextTokens, substituteTextDisplays } from './substitution.js';
import type { XCSFile } from './builder.js';
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

function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

/** Decodes a `data:<mimeType>;base64,<data>` URL into its raw bytes and mime type. */
function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;

  const [, mimeType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

function coverResourceEntries(coverDataUrl: string): Record<string, Uint8Array> {
  const cover = decodeDataUrl(coverDataUrl);
  if (!cover) return {};

  return {
    'resources/project-cover.png': cover.bytes,
    'resources/project-cover.png.meta.json': encodeJson({
      ref: 'resources/project-cover.png',
      metadata: {
        kind: 'image',
        source: { type: 'workspace', value: 'project-cover.png' },
        mimeType: cover.mimeType,
      },
    }),
  };
}

/**
 * Packages a freshly generated `.xcs`-shaped project (from
 * `XCSGenerator.generate()`) into a `.xs` (v2 workspace) ZIP archive --
 * the "build" counterpart to this module's read/substitute functions
 * above. Display objects (TEXT/PATH/BITMAP) carry over completely
 * unchanged, since that schema is identical between formats (see this
 * module's doc comment); only the container -- project/canvas/device
 * metadata -- is synthesized fresh.
 *
 * Processing profiles and device bindings are left empty: no
 * `addProfile`/processing API exists on `XCSGenerator` yet, matching
 * how the `.xcs` generator's own `device` field is similarly minimal
 * (`data: { dataType: 'Map', value: [] }`). A generated `.xs` file may
 * need power/speed configured manually in xTool Studio before
 * cutting/engraving -- this is unverified against the real
 * application, like the curved-text caveats documented in
 * `src/glyphs.ts`.
 *
 * Only single-canvas, single-chunk output is produced (`XCSGenerator`
 * itself only ever builds one canvas); real xTool Studio exports may
 * split a canvas's displays across multiple `displays-<n>.json` chunks,
 * but a single chunk is equally valid.
 */
export function buildXsArchive(file: XCSFile): Uint8Array {
  const canvas = file.canvas[0];
  if (!canvas) {
    throw new Error('Cannot build a .xs archive from a project with no canvas.');
  }

  return zipSync({
    '.format': new TextEncoder().encode('v2'),
    'meta/persistence-meta.json': encodeJson({
      schemaVersion: '2.0.0',
      protocol: 'xcs-workspace-v2',
    }),
    'project.json': encodeJson({
      __v2__: true,
      version: '2.0.0',
      schemaMeta: { schemaVersion: '2.1.0', format: 'directory' },
      projectId: file.projectTraceID,
      projectTraceID: file.projectTraceID,
      projectName: 'Untitled',
      activeCanvasId: canvas.id,
      activeDeviceId: file.device.id,
      versionInfo: {
        source: 'web',
        appVersion: '',
        savedAt: file.modify,
        ua: file.ua,
        minRequiredVersion: file.minRequiredVersion,
        appMinRequiredVersion: file.appMinRequiredVersion,
        webMinRequiredVersion: file.webMinRequiredVersion,
      },
      created: file.created,
      modify: file.modify,
      modules: { canvases: [canvas.id], devices: [file.device.id] },
      cover: 'resources/project-cover.png',
      customProjectData: { projectTraceID: file.projectTraceID },
    }),
    'profiles.json': encodeJson({ profiles: {} }),
    [`canvases/${canvas.id}.json`]: encodeJson({
      id: canvas.id,
      title: canvas.title,
      hidden: false,
      layerData: canvas.layerData,
      groupData: canvas.groupData,
      extendInfo: {
        version: canvas.extendInfo.version,
        minCanvasVersion: canvas.extendInfo.minCanvasVersion,
        displayProcessConfigMap: {},
        rulerPluginData: { rulerGuide: [] },
        type: '2d',
      },
      chunkLayout: { displayCount: canvas.displays.length, chunkCount: 1, chunkIndexes: [0] },
    }),
    [`canvases/${canvas.id}/displays-0.json`]: encodeJson({
      canvasId: canvas.id,
      chunkIndex: 0,
      displays: canvas.displays,
    }),
    [`devices/device-${file.device.id}.json`]: encodeJson({
      id: file.device.id,
      deviceCode: file.device.id,
      extId: file.extId,
      extName: file.extName,
      power: [file.device.power],
      processing: {
        [canvas.id]: {
          id: canvas.id,
          activeMode: 'LASER_PLANE',
          modes: {
            LASER_PLANE: {
              ignoredDisplayIds: [],
              data: {
                material: 0,
                thickness: null,
                perimeter: null,
                diameter: null,
                isProcessByLayer: false,
                pathPlanning: 'auto',
                fillPlanning: 'separate',
                scanDirection: 'topToBottom',
                enableOddEvenKerf: true,
                focalLen: null,
                focalLength: null,
              },
              profileRefs: [],
              patches: {},
              bindings: [],
            },
          },
        },
      },
    }),
    ...coverResourceEntries(file.cover),
  });
}

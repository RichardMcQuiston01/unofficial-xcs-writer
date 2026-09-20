import type { XcsProject, XcsVariable } from './types.js';
import { collectTextTokens, substituteTextDisplays } from './substitution.js';
import type * as opentype from 'opentype.js';

export function assertXcsFormat(buffer: ArrayBuffer): void {
  let project: unknown;
  try {
    project = JSON.parse(new TextDecoder().decode(buffer));
  } catch (err) {
    throw new Error(`Not a valid .xcs file: ${(err as Error).message}`);
  }
  if (
    typeof project !== 'object' ||
    project === null ||
    !Array.isArray((project as Record<string, unknown>).canvas)
  ) {
    throw new Error('Not a valid .xcs file: missing canvas array.');
  }
}

export function readXcsFile(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

export function extractXcsTokens(buffer: ArrayBuffer): string[] {
  const project = JSON.parse(readXcsFile(buffer)) as XcsProject;
  const seen = new Set<string>();

  for (const canvas of project.canvas) {
    collectTextTokens(canvas.displays, seen);
  }

  return Array.from(seen);
}

/**
 * Substitutes `{{token}}` placeholders in TEXT display `text` fields.
 *
 * Whenever a display's text actually changes, its glyph outline data
 * (`charJSONs` / `fontData.glyphData`) is regenerated from a real font
 * so xTool Studio renders the new text correctly instead of showing
 * stale or placeholder glyph shapes (see src/glyphs.ts for the format
 * this was reverse-engineered from, and its documented limitations --
 * notably, curved-text layout is not reproduced).
 *
 * Pass `fonts` to supply real font file bytes keyed by the TEXT
 * display's `style.fontFamily`; displays whose font isn't supplied
 * fall back to a bundled metric-compatible default (Arimo, standing in
 * for Arial). Displays whose text doesn't change are left untouched.
 */
export function renderXcsFile(
  buffer: ArrayBuffer,
  variables: XcsVariable[],
  values: Record<string, string>,
  fonts?: Record<string, ArrayBuffer>
): Uint8Array {
  const project = JSON.parse(readXcsFile(buffer)) as XcsProject;
  const fontCache = new Map<string, opentype.Font>();

  for (const canvas of project.canvas) {
    substituteTextDisplays(canvas.displays, variables, values, fonts, fontCache);
  }

  return new TextEncoder().encode(JSON.stringify(project));
}

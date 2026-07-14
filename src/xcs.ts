import type { XcsProject, XcsVariable } from './types.js';
import { loadDefaultFont, loadFont, layoutText } from './glyphs.js';
import type * as opentype from 'opentype.js';

const TOKEN_RE = /\{\{([^}]+)\}\}/g;

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
    for (const display of canvas.displays) {
      if (display.type === 'TEXT' && typeof display.text === 'string') {
        for (const match of display.text.matchAll(TOKEN_RE)) {
          seen.add(match[1]);
        }
      }
    }
  }

  return Array.from(seen);
}

function resolveFont(
  fontFamily: string | undefined,
  fonts: Record<string, ArrayBuffer> | undefined,
  cache: Map<string, opentype.Font>,
): opentype.Font {
  const key = fontFamily ?? '';
  const cached = cache.get(key);
  if (cached) return cached;

  const suppliedBuffer = fontFamily ? fonts?.[fontFamily] : undefined;
  const font = suppliedBuffer ? loadFont(suppliedBuffer) : loadDefaultFont();
  cache.set(key, font);
  return font;
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
  fonts?: Record<string, ArrayBuffer>,
): Uint8Array {
  const project = JSON.parse(readXcsFile(buffer)) as XcsProject;
  const fontCache = new Map<string, opentype.Font>();

  for (const canvas of project.canvas) {
    for (const display of canvas.displays) {
      if (display.type === 'TEXT' && typeof display.text === 'string') {
        const originalText = display.text;
        let text = originalText;
        for (const variable of variables) {
          const replacement = values[variable.token] ?? variable.defaultValue ?? '';
          text = text.replaceAll(`{{${variable.token}}}`, replacement);
        }
        display.text = text;

        if (text === originalText) continue;

        const style = display.style as { fontFamily?: string } | undefined;
        const font = resolveFont(style?.fontFamily, fonts, fontCache);
        const originX = typeof display.x === 'number' ? display.x : 0;
        const originY = typeof display.y === 'number' ? display.y : 0;

        const layout = layoutText(font, text, originX, originY);
        display.fontData = layout.fontData;
        display.charJSONs = layout.charJSONs;
        if (layout.x !== null && layout.y !== null) {
          display.x = layout.x;
          display.y = layout.y;
          display.offsetX = layout.x;
          display.offsetY = layout.y;
          display.width = layout.width;
          display.height = layout.height;
        }
      }
    }
  }

  return new TextEncoder().encode(JSON.stringify(project));
}

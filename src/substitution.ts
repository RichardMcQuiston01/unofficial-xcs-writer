import type { XcsDisplay, XcsVariable } from './types.js';
import { loadDefaultFont, loadFont, layoutText } from './glyphs.js';
import type * as opentype from 'opentype.js';

const TOKEN_RE = /\{\{([^}]+)\}\}/g;

/** Adds every `{{token}}` name found in TEXT displays' `text` fields to `seen`. */
export function collectTextTokens(displays: XcsDisplay[], seen: Set<string>): void {
  for (const display of displays) {
    if (display.type === 'TEXT' && typeof display.text === 'string') {
      for (const match of display.text.matchAll(TOKEN_RE)) {
        seen.add(match[1]);
      }
    }
  }
}

function resolveFont(
  fontFamily: string | undefined,
  fonts: Record<string, ArrayBuffer> | undefined,
  cache: Map<string, opentype.Font>
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
 * Substitutes `{{token}}` placeholders in TEXT displays' `text` fields,
 * in place. Whenever a display's text actually changes, its glyph
 * outline data (`charJSONs` / `fontData.glyphData`) is regenerated from
 * a real font so xTool Studio renders the new text correctly instead of
 * showing stale or placeholder glyph shapes (see src/glyphs.ts for the
 * format this was reverse-engineered from, and its documented
 * limitations -- notably, curved-text layout is not reproduced).
 *
 * Pass `fonts` to supply real font file bytes keyed by each display's
 * `style.fontFamily`; displays whose font isn't supplied fall back to a
 * bundled metric-compatible default (Arimo, standing in for Arial).
 * Displays whose text doesn't change are left untouched.
 */
export function substituteTextDisplays(
  displays: XcsDisplay[],
  variables: XcsVariable[],
  values: Record<string, string>,
  fonts: Record<string, ArrayBuffer> | undefined,
  fontCache: Map<string, opentype.Font>
): void {
  for (const display of displays) {
    if (display.type !== 'TEXT' || typeof display.text !== 'string') continue;

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

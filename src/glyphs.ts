// opentype.js is a CJS-only UMD build with no "exports" map, so under
// native ESM only the default import is reliably populated -- a
// namespace import (`import * as opentype`) leaves named properties
// like `.parse` undefined at runtime in built ESM output.
import opentype from 'opentype.js';
import { ARIMO_REGULAR_WOFF_BASE64 } from './assets/arimo-regular.js';

/**
 * Real glyph outline extraction for XCS TEXT displays, replacing the
 * placeholder-square glyphs that a naive generator (or an .xcs file
 * whose TEXT display has an empty `charJSONs`) would otherwise produce.
 *
 * xTool Studio's on-disk format was reverse-engineered by diffing a
 * generated .xcs file against the same file re-saved by xTool Studio,
 * both unchanged and after manually re-selecting the font (see this
 * repo's CLAUDE.md "Open Issues" for the full writeup). Key findings
 * baked into the math below:
 *
 * - `charJSONs` (not `fontData.glyphData`) is what actually renders on
 *   canvas -- one PATH-shaped entry per non-whitespace character.
 * - Font design coordinates are always scaled so that 1 em == 25.4mm
 *   (1 inch), independent of the `style.fontSize` value written
 *   alongside it (empirically confirmed against real Arial metrics).
 * - `fontData.glyphData[char].bbox` / `advanceWidth` / `leftBearing`
 *   use the font's native Y-up convention. `charJSONs[i].dPath` uses a
 *   Y-down convention (flip Y) and is expressed in glyph-local
 *   coordinates relative to that character's own pen/baseline origin
 *   (`graphicX`/`graphicY`), i.e. dPath is NOT pre-translated to the
 *   character's absolute canvas position.
 * - `charJSONs[i].x/y` is the character's ink bounding-box top-left in
 *   absolute canvas coordinates: x = graphicX + bbox.minX,
 *   y = graphicY - bbox.maxY. width/height are the ink bbox extents.
 * - A TEXT display's own `x`/`y` equals the FIRST character's box
 *   top-left (x[0]/y[0]) -- i.e. it is not a separate anchor to
 *   recompute, it doubles as charJSONs[0]'s position.
 *
 * Known limitation: this only replicates STRAIGHT horizontal-baseline
 * layout (constant graphicY, cumulative graphicX via advance widths).
 * xTool Studio's `style.curveX`/`curveY` curved-text layout formula is
 * undocumented and was not reverse-engineerable with confidence from
 * available samples, so curved text is not reproduced -- substituted
 * text on a curved TEXT display will render with real glyph shapes,
 * correctly shaped, but laid out on a straight baseline instead of
 * the original curve.
 */

const MM_PER_EM = 25.4;

export interface GlyphBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GlyphData {
  dPath: string;
  advanceWidth: number;
  advanceHeight: number;
  leftBearing: number;
  topBearing: number;
  bbox: GlyphBBox;
}

export interface FontInfo {
  unitsPerEm: number;
  lineHeight: number;
  ascent: number;
  descent: number;
  capHeight: number;
  xHeight: number;
  lineGap: number;
}

export interface FontData {
  fontInfo: FontInfo;
  glyphData: Record<string, GlyphData>;
}

export interface CharJson {
  id: string;
  type: 'PATH';
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  graphicX: number;
  graphicY: number;
  dPath: string;
  fillRule: 'nonzero';
  isFill: boolean;
}

export interface TextLayoutResult {
  fontData: FontData;
  charJSONs: CharJson[];
  /** New display x/y (== charJSONs[0]'s box top-left), only present if text is non-empty. */
  x: number | null;
  y: number | null;
  width: number;
  height: number;
}

let cachedDefaultFont: opentype.Font | null = null;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Loads and parses a font file (TTF/OTF/WOFF) for glyph extraction. */
export function loadFont(buffer: ArrayBuffer): opentype.Font {
  return opentype.parse(buffer);
}

/** The bundled fallback font (Arimo, metric-compatible with Arial, Apache-2.0). */
export function loadDefaultFont(): opentype.Font {
  if (!cachedDefaultFont) {
    cachedDefaultFont = loadFont(base64ToArrayBuffer(ARIMO_REGULAR_WOFF_BASE64));
  }
  return cachedDefaultFont;
}

function scaleFor(font: opentype.Font): number {
  return MM_PER_EM / font.unitsPerEm;
}

function fontInfoFor(font: opentype.Font): FontInfo {
  const scale = scaleFor(font);
  const os2 = font.tables['os2'] as { sCapHeight?: number; sxHeight?: number } | undefined;
  const capHeight = os2?.sCapHeight ?? Math.round(font.unitsPerEm * 0.7);
  const xHeight = os2?.sxHeight ?? Math.round(font.unitsPerEm * 0.5);
  return {
    unitsPerEm: font.unitsPerEm,
    lineHeight: (font.ascender - font.descender) * scale,
    ascent: font.ascender * scale,
    descent: font.descender * scale,
    capHeight: capHeight * scale,
    xHeight: xHeight * scale,
    lineGap: 0,
  };
}

/** A glyph with no visible ink (whitespace, or a font with no outline for this character). */
function isEmptyGlyph(glyph: opentype.Glyph): boolean {
  const path = glyph.path;
  return !path || path.commands.length === 0;
}

function pathToDString(path: opentype.Path, scale: number): string {
  const fmt = (n: number): string => {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };
  // xTool's dPath uses a Y-down convention; opentype.js paths are Y-up
  // (baseline at 0, ascenders positive), so Y is negated here.
  const parts: string[] = [];
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        parts.push(`M${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`);
        break;
      case 'L':
        parts.push(`L${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`);
        break;
      case 'Q':
        parts.push(
          `Q${fmt(cmd.x1 * scale)} ${fmt(-cmd.y1 * scale)} ${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`
        );
        break;
      case 'C':
        parts.push(
          `C${fmt(cmd.x1 * scale)} ${fmt(-cmd.y1 * scale)} ${fmt(cmd.x2 * scale)} ${fmt(-cmd.y2 * scale)} ${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`
        );
        break;
      case 'Z':
        parts.push('Z');
        break;
    }
  }
  return parts.join('');
}

function bboxFor(path: opentype.Path, scale: number): GlyphBBox {
  const box = path.getBoundingBox();
  return {
    minX: box.x1 * scale,
    minY: box.y1 * scale,
    maxX: box.x2 * scale,
    maxY: box.y2 * scale,
  };
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Builds glyphData + charJSONs for `text` laid out on a straight
 * horizontal baseline, anchored so the first character's ink
 * bounding-box top-left lands at (originX, originY) -- matching how
 * an xTool Studio TEXT display's own x/y equals charJSONs[0]'s x/y.
 */
export function layoutText(
  font: opentype.Font,
  text: string,
  originX: number,
  originY: number
): TextLayoutResult {
  const scale = scaleFor(font);
  const fontInfo = fontInfoFor(font);
  const glyphData: Record<string, GlyphData> = {};
  const charJSONs: CharJson[] = [];

  let graphicX: number | null = null;
  let graphicY = originY;
  let firstBox: GlyphBBox | null = null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const advanceWidth = (glyph.advanceWidth ?? 0) * scale;

    if (!glyphData[char]) {
      // Raw, unscaled path in the font's native Y-up convention
      // (baseline at 0, ascenders positive) -- NOT glyph.getPath(x, y,
      // fontSize), which opentype.js Y-flips for canvas rendering when
      // given explicit coordinates, and would double-flip against our
      // own conversion below.
      const path = glyph.path;
      if (isEmptyGlyph(glyph)) {
        glyphData[char] = {
          dPath: '',
          advanceWidth,
          advanceHeight: fontInfo.lineHeight,
          leftBearing: 0,
          topBearing: 0,
          bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
        };
      } else {
        const bbox = bboxFor(path, scale);
        glyphData[char] = {
          dPath: pathToDString(path, scale),
          advanceWidth,
          advanceHeight: fontInfo.lineHeight,
          leftBearing: (glyph.leftSideBearing ?? 0) * scale,
          topBearing: fontInfo.ascent - bbox.maxY,
          bbox,
        };
      }
    }

    const data = glyphData[char];
    const hasInk = data.dPath !== '';

    if (graphicX === null) {
      // Anchor the first character (visible or not) at (originX, originY).
      graphicX = hasInk ? originX - data.bbox.minX : originX;
      if (hasInk) graphicY = originY + data.bbox.maxY;
    }

    if (hasInk) {
      const x = graphicX + data.bbox.minX;
      const y = graphicY - data.bbox.maxY;
      const width = data.bbox.maxX - data.bbox.minX;
      const height = data.bbox.maxY - data.bbox.minY;

      // dPath is glyph-local (relative to the pen origin graphicX/Y),
      // matching the observed xTool convention -- same shape as
      // fontData.glyphData[char].dPath, computed once and cached above.
      charJSONs.push({
        id: generateUuid(),
        type: 'PATH',
        x,
        y,
        width,
        height,
        offsetX: x,
        offsetY: y,
        graphicX,
        graphicY,
        dPath: data.dPath,
        fillRule: 'nonzero',
        isFill: true,
      });

      if (!firstBox) firstBox = { minX: x, minY: y, maxX: x + width, maxY: y + height };
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    }

    graphicX += advanceWidth;
  }

  return {
    fontData: { fontInfo, glyphData },
    charJSONs,
    x: firstBox ? firstBox.minX : null,
    y: firstBox ? firstBox.minY : null,
    width: Number.isFinite(maxX - minX) ? maxX - minX : 0,
    height: Number.isFinite(maxY - minY) ? maxY - minY : 0,
  };
}

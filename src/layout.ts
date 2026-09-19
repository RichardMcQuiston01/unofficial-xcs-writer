import { layoutText, loadFont, type CharJson, type FontData } from './glyphs.js';

/**
 * Higher-level text layout built on `layoutText`'s straight, fixed-em
 * glyph extraction: rescaling to a real-world font size, anchoring at
 * a world position, multi-line stacking, and (new) laying a single
 * line out along a circular arc.
 *
 * `layoutText` always produces glyphs at a fixed em size (25.4mm) at
 * the origin -- everything here rescales and repositions that output
 * rather than re-extracting glyph outlines per call.
 */

/** `layoutText`'s fixed em size: 72 pt = 1 inch = 25.4 mm. */
const LAYOUT_MM_PER_EM = 25.4;

/** xTool Studio's `style.fontSize` unit is points (72 pt per em). */
export function fontSizePoints(emSizeMm: number): number {
  return (emSizeMm / LAYOUT_MM_PER_EM) * 72;
}

/** A parsed font usable for glyph extraction. */
export type XcsFont = ReturnType<typeof loadFont>;

/** A glyph layout scaled and positioned for one TEXT display. */
export interface GlyphTextLayout {
  fontData: FontData;
  charJSONs: CharJson[];
  /** Ink bounding box of the laid-out text, in world mm. */
  x: number;
  y: number;
  width: number;
  height: number;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Multiplies every coordinate in a path data string by `factor`. */
function scaleDPath(dPath: string, factor: number): string {
  return dPath.replace(/-?\d+(?:\.\d+)?/g, (value) => formatNumber(Number(value) * factor));
}

/**
 * Rotates a path's points by `angleRad` around its own local origin
 * (0, 0) -- which, per `charJSONs[i].dPath`'s convention, is that
 * character's own pen/baseline anchor (`graphicX`/`graphicY`), so
 * rotating around (0, 0) in path-local space rotates the glyph shape
 * around its own anchor point in world space. Returns the rotated
 * path plus its new local bounding box (min/max over every path
 * coordinate, including Bezier control points -- a small, safe
 * over-estimate of the true ink bbox, same tradeoff `layoutText`
 * already accepts elsewhere).
 */
function rotateDPath(
  dPath: string,
  angleRad: number,
): { dPath: string; minX: number; minY: number; maxX: number; maxY: number } {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const rotated = dPath.replace(
    /([MLQCZ])([^MLQCZ]*)/g,
    (_match, cmd: string, argsStr: string) => {
      if (cmd === 'Z') return 'Z';
      const nums = argsStr
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0)
        .map(Number);
      const out: number[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        out.push(rx, ry);
        minX = Math.min(minX, rx);
        maxX = Math.max(maxX, rx);
        minY = Math.min(minY, ry);
        maxY = Math.max(maxY, ry);
      }
      return cmd + out.map(formatNumber).join(' ');
    },
  );

  if (!Number.isFinite(minX)) {
    // No coordinates found (shouldn't happen for a real glyph) -- keep a degenerate, finite bbox.
    return { dPath: rotated, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { dPath: rotated, minX, minY, maxX, maxY };
}

/**
 * Lays out `text` in `font` at `emSizeMm` (the canvas font size, mm
 * per em), anchored so the ink bounding box's top-left lands at
 * (xMm, yMm) in world coordinates. `letterSpacingMm` adds fixed extra
 * advance per character position. Returns null when the text has no
 * ink (empty or whitespace only).
 */
export function layoutGlyphText(
  font: XcsFont,
  text: string,
  emSizeMm: number,
  xMm: number,
  yMm: number,
  letterSpacingMm = 0,
): GlyphTextLayout | null {
  const layout = layoutText(font, text, 0, 0);
  if (layout.charJSONs.length === 0) return null;
  const factor = emSizeMm / LAYOUT_MM_PER_EM;

  // charJSONs hold only inked characters, in text order -- walk the
  // text to recover each one's character position so letter spacing
  // counts spaces too.
  const spacingShifts: number[] = [];
  if (letterSpacingMm > 0) {
    let position = 0;
    for (const char of text) {
      const glyph = layout.fontData.glyphData[char];
      if (glyph && glyph.dPath !== '') {
        spacingShifts.push(position * letterSpacingMm);
      }
      position += 1;
    }
  }
  const spacingFor = (index: number): number => spacingShifts[index] ?? 0;

  // Scale + space at the origin first, then shift so the resulting
  // ink box's top-left lands exactly on (xMm, yMm) -- descenders and
  // overhangs can extend past the first character's box.
  const placed = layout.charJSONs.map((char, index) => ({
    ...char,
    x: char.x * factor + spacingFor(index),
    y: char.y * factor,
    width: char.width * factor,
    height: char.height * factor,
    offsetX: char.offsetX * factor + spacingFor(index),
    offsetY: char.offsetY * factor,
    graphicX: char.graphicX * factor + spacingFor(index),
    graphicY: char.graphicY * factor,
    dPath: scaleDPath(char.dPath, factor),
  }));
  const inkMinX = Math.min(...placed.map((char) => char.x));
  const inkMinY = Math.min(...placed.map((char) => char.y));
  const inkMaxX = Math.max(...placed.map((char) => char.x + char.width));
  const inkMaxY = Math.max(...placed.map((char) => char.y + char.height));
  const shiftX = xMm - inkMinX;
  const shiftY = yMm - inkMinY;

  const charJSONs = placed.map((char) => ({
    ...char,
    x: char.x + shiftX,
    y: char.y + shiftY,
    offsetX: char.offsetX + shiftX,
    offsetY: char.offsetY + shiftY,
    graphicX: char.graphicX + shiftX,
    graphicY: char.graphicY + shiftY,
  }));

  const info = layout.fontData.fontInfo;
  const fontData: FontData = {
    fontInfo: {
      ...info,
      lineHeight: info.lineHeight * factor,
      ascent: info.ascent * factor,
      descent: info.descent * factor,
      capHeight: info.capHeight * factor,
      xHeight: info.xHeight * factor,
    },
    glyphData: Object.fromEntries(
      Object.entries(layout.fontData.glyphData).map(([char, glyph]) => [
        char,
        {
          dPath: scaleDPath(glyph.dPath, factor),
          advanceWidth: glyph.advanceWidth * factor,
          advanceHeight: glyph.advanceHeight * factor,
          leftBearing: glyph.leftBearing * factor,
          topBearing: glyph.topBearing * factor,
          bbox: {
            minX: glyph.bbox.minX * factor,
            minY: glyph.bbox.minY * factor,
            maxX: glyph.bbox.maxX * factor,
            maxY: glyph.bbox.maxY * factor,
          },
        },
      ]),
    ),
  };

  return {
    fontData,
    charJSONs,
    x: xMm,
    y: yMm,
    width: inkMaxX - inkMinX,
    height: inkMaxY - inkMinY,
  };
}

/**
 * Multi-line layout: each line laid out separately, aligned within
 * the block and vertically centered in its line slot (fontSize x
 * lineHeight), stacked top to bottom. Anchored at (0, 0); block width
 * is the widest line, block height the slots total. Returns null
 * when no line has ink.
 */
export function layoutMultilineGlyphText(
  font: XcsFont,
  text: string,
  emSizeMm: number,
  letterSpacingMm: number,
  lineHeightMult: number,
  align: 'left' | 'center' | 'right',
): GlyphTextLayout | null {
  const lines = text.split('\n');
  if (lines.length === 1) {
    return layoutGlyphText(font, text, emSizeMm, 0, 0, letterSpacingMm);
  }
  const slot = emSizeMm * lineHeightMult;
  const layouts = lines.map((line) => layoutGlyphText(font, line, emSizeMm, 0, 0, letterSpacingMm));
  const blockWidth = Math.max(0, ...layouts.map((layout) => layout?.width ?? 0));
  const charJSONs: GlyphTextLayout['charJSONs'] = [];
  const glyphData: FontData['glyphData'] = {};
  let fontInfo: FontData['fontInfo'] | null = null;
  layouts.forEach((layout, index) => {
    if (!layout) return; // blank line -- still occupies its slot
    const insetX =
      align === 'center'
        ? (blockWidth - layout.width) / 2
        : align === 'right'
          ? blockWidth - layout.width
          : 0;
    const insetY = index * slot + (slot - layout.height) / 2;
    const placed = translateGlyphLayout(layout, insetX, insetY);
    charJSONs.push(...placed.charJSONs);
    Object.assign(glyphData, placed.fontData.glyphData);
    fontInfo = fontInfo ?? placed.fontData.fontInfo;
  });
  if (charJSONs.length === 0 || !fontInfo) return null;
  return {
    fontData: { fontInfo, glyphData },
    charJSONs,
    x: 0,
    y: 0,
    width: blockWidth,
    height: slot * lines.length,
  };
}

/** The same layout shifted by (dxMm, dyMm) -- cheaper than relaying out. */
export function translateGlyphLayout(
  layout: GlyphTextLayout,
  dxMm: number,
  dyMm: number,
): GlyphTextLayout {
  if (dxMm === 0 && dyMm === 0) return layout;
  return {
    ...layout,
    x: layout.x + dxMm,
    y: layout.y + dyMm,
    charJSONs: layout.charJSONs.map((char) => ({
      ...char,
      x: char.x + dxMm,
      y: char.y + dyMm,
      offsetX: char.offsetX + dxMm,
      offsetY: char.offsetY + dyMm,
      graphicX: char.graphicX + dxMm,
      graphicY: char.graphicY + dyMm,
    })),
  };
}

// ---------------------------------------------------------------------------
// Curved text
// ---------------------------------------------------------------------------

/** Curves flatter than this are treated as straight text. */
const MIN_CURVE_DEG = 1;
/** A full circle breaks the chord math; stop just short of it. */
const MAX_CURVE_DEG = 355;

/** The effective curve of a textbox; 0 means straight. */
export function effectiveCurveDeg(curveDeg: number | undefined): number {
  if (curveDeg === undefined || Math.abs(curveDeg) < MIN_CURVE_DEG) return 0;
  return Math.max(-MAX_CURVE_DEG, Math.min(MAX_CURVE_DEG, curveDeg));
}

interface ArcGeometry {
  radius: number;
  /** Total arc-length spanned by `curveDeg` across `widthMm`, in mm. */
  arcLength: number;
  centerX: number;
  centerY: number;
  /** Angle (radians) of the arc's start point, measured from the center. */
  startAngle: number;
  /** Radians of arc-angle per mm of arc-length travelled from the start, signed. */
  angleStep: number;
}

/**
 * The circular arc a curved textbox's baseline follows: same chord
 * (`widthMm`), sweep (`curveDeg`), and up/down convention as the
 * canvas editor and SVG export (`curveGeometry` in
 * `@maker-toolkit/template-render` / `apps/desktop/src/shared/curved-text.ts`)
 * -- positive curves the apex upward (toward smaller y), negative bows
 * it downward. Returns null for effectively-straight text.
 */
function arcGeometryFor(widthMm: number, heightMm: number, curveDeg: number): ArcGeometry | null {
  const deg = effectiveCurveDeg(curveDeg);
  if (deg === 0 || widthMm <= 0) return null;
  const theta = (Math.abs(deg) * Math.PI) / 180;
  const radius = widthMm / (2 * Math.sin(theta / 2));
  const sagitta = radius * (1 - Math.cos(theta / 2));
  const up = deg > 0;
  const endY = up ? (heightMm + sagitta) / 2 : (heightMm - sagitta) / 2;
  const centerX = widthMm / 2;
  const centerY = up ? endY + radius * Math.cos(theta / 2) : endY - radius * Math.cos(theta / 2);
  const startAngle = Math.atan2(endY - centerY, 0 - centerX);
  return {
    radius,
    arcLength: radius * theta,
    centerX,
    centerY,
    startAngle,
    angleStep: (up ? 1 : -1) / radius,
  };
}

/** The point on `arc` at arc-length `s` from its start, and the baseline's tangent angle there. */
function pointOnArc(arc: ArcGeometry, s: number): { x: number; y: number; angleRad: number } {
  const angle = arc.startAngle + arc.angleStep * s;
  const direction = Math.sign(arc.angleStep) || 1;
  return {
    x: arc.centerX + arc.radius * Math.cos(angle),
    y: arc.centerY + arc.radius * Math.sin(angle),
    angleRad: Math.atan2(Math.cos(angle) * direction, -Math.sin(angle) * direction),
  };
}

/**
 * Lays out a single line of `text` along a circular arc spanning
 * `curveDeg` degrees across a `boxWidthMm`-wide, `boxHeightMm`-tall
 * box -- the same geometry (chord, sweep, up/down sign, and
 * align-driven start offset) the canvas editor and SVG export already
 * use for curved text, so the same document renders consistently
 * across formats. Falls back to `layoutGlyphText` when `curveDeg` is
 * effectively 0.
 *
 * XCS has no line-level curve primitive of its own (`style.curveX`/
 * `curveY`'s real formula is undocumented -- see `glyphs.ts`), so
 * unlike SVG's `<textPath>` this bakes the curve directly into each
 * character: its own `dPath` is rotated to the arc's local tangent
 * and repositioned onto the arc, the same way substituted text
 * already bakes real glyph shapes rather than relying on xTool Studio
 * to re-shape anything.
 *
 * A character's position along the arc is taken from its share of
 * the straight layout's ink width (its ink-box center, as a fraction
 * of total ink width) rather than true glyph-by-glyph arc-length
 * integration -- the same simplification SVG's own `<textPath>`
 * makes when no `textLength` is given. This has not been visually
 * verified against real xTool Studio rendering (no way to do so
 * outside the application itself) -- treat curved output as
 * best-effort until spot-checked.
 *
 * Multi-line curved text is not supported (matches the canvas editor
 * and SVG export today): pass already-flattened single-line text.
 */
export function layoutCurvedGlyphText(
  font: XcsFont,
  text: string,
  emSizeMm: number,
  curveDeg: number,
  boxWidthMm: number,
  boxHeightMm: number,
  align: 'left' | 'center' | 'right' = 'left',
  letterSpacingMm = 0,
): GlyphTextLayout | null {
  const straight = layoutGlyphText(font, text, emSizeMm, 0, 0, letterSpacingMm);
  if (!straight) return null;

  const arc = arcGeometryFor(boxWidthMm, boxHeightMm, curveDeg);
  if (!arc) return straight;

  const startOffset =
    align === 'center'
      ? (arc.arcLength - straight.width) / 2
      : align === 'right'
        ? arc.arcLength - straight.width
        : 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const charJSONs: CharJson[] = straight.charJSONs.map((char) => {
    const charCenter = char.x - straight.x + char.width / 2;
    const { x: anchorX, y: anchorY, angleRad } = pointOnArc(arc, startOffset + charCenter);
    const rotated = rotateDPath(char.dPath, angleRad);
    const x = anchorX + rotated.minX;
    const y = anchorY + rotated.minY;
    const width = rotated.maxX - rotated.minX;
    const height = rotated.maxY - rotated.minY;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
    return {
      ...char,
      x,
      y,
      width,
      height,
      offsetX: x,
      offsetY: y,
      graphicX: anchorX,
      graphicY: anchorY,
      dPath: rotated.dPath,
    };
  });

  return {
    fontData: straight.fontData,
    charJSONs,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

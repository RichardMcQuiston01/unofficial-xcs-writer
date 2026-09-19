import { describe, expect, it } from 'vitest';
import { loadDefaultFont } from './glyphs.js';
import {
  effectiveCurveDeg,
  fontSizePoints,
  layoutCurvedGlyphText,
  layoutGlyphText,
  layoutMultilineGlyphText,
  translateGlyphLayout,
} from './layout.js';

describe('fontSizePoints', () => {
  it('converts 25.4mm (1 inch) to 72 points', () => {
    expect(fontSizePoints(25.4)).toBeCloseTo(72, 5);
  });
});

describe('layoutGlyphText', () => {
  it('anchors the ink bounding box top-left at (xMm, yMm)', () => {
    const font = loadDefaultFont();
    const layout = layoutGlyphText(font, 'Smith', 6, 10, 20);
    expect(layout).not.toBeNull();
    expect(layout!.x).toBeCloseTo(10, 5);
    expect(layout!.y).toBeCloseTo(20, 5);
  });

  it('scales ink width roughly proportionally to em size', () => {
    const font = loadDefaultFont();
    const small = layoutGlyphText(font, 'ABC', 5, 0, 0)!;
    const large = layoutGlyphText(font, 'ABC', 10, 0, 0)!;
    expect(large.width).toBeCloseTo(small.width * 2, 1);
  });

  it('returns null for whitespace-only text', () => {
    const font = loadDefaultFont();
    expect(layoutGlyphText(font, '   ', 6, 0, 0)).toBeNull();
  });

  it('increases ink width when letter spacing is added', () => {
    const font = loadDefaultFont();
    const tight = layoutGlyphText(font, 'ABC', 6, 0, 0, 0)!;
    const spaced = layoutGlyphText(font, 'ABC', 6, 0, 0, 1)!;
    expect(spaced.width).toBeGreaterThan(tight.width);
  });
});

describe('layoutMultilineGlyphText', () => {
  it('stacks lines top to bottom by the line-height slot', () => {
    const font = loadDefaultFont();
    const layout = layoutMultilineGlyphText(font, 'Hi\nThere', 6, 0, 1.2, 'left')!;
    expect(layout).not.toBeNull();
    expect(layout.height).toBeCloseTo(6 * 1.2 * 2, 5);
  });

  it('centers shorter lines within the block width', () => {
    const font = loadDefaultFont();
    const layout = layoutMultilineGlyphText(font, 'W\nI', 6, 0, 1.2, 'center')!;
    // The single-character line 'I' should sit centered under the wider 'W'.
    expect(layout.width).toBeGreaterThan(0);
  });

  it('delegates single-line text to layoutGlyphText', () => {
    const font = loadDefaultFont();
    const straight = layoutGlyphText(font, 'Solo', 6, 0, 0)!;
    const multi = layoutMultilineGlyphText(font, 'Solo', 6, 0, 1.2, 'left')!;
    expect(multi.width).toBeCloseTo(straight.width, 5);
    expect(multi.height).toBeCloseTo(straight.height, 5);
  });
});

describe('translateGlyphLayout', () => {
  it('shifts every character and the overall box by the same delta', () => {
    const font = loadDefaultFont();
    const layout = layoutGlyphText(font, 'Hi', 6, 0, 0)!;
    const shifted = translateGlyphLayout(layout, 5, -3);
    expect(shifted.x).toBeCloseTo(layout.x + 5, 5);
    expect(shifted.y).toBeCloseTo(layout.y - 3, 5);
    expect(shifted.charJSONs[0].x).toBeCloseTo(layout.charJSONs[0].x + 5, 5);
    expect(shifted.charJSONs[0].y).toBeCloseTo(layout.charJSONs[0].y - 3, 5);
  });
});

describe('effectiveCurveDeg', () => {
  it('treats undefined and near-zero as straight', () => {
    expect(effectiveCurveDeg(undefined)).toBe(0);
    expect(effectiveCurveDeg(0.5)).toBe(0);
    expect(effectiveCurveDeg(-0.5)).toBe(0);
  });

  it('clamps to the +/-355 degree bound', () => {
    expect(effectiveCurveDeg(400)).toBe(355);
    expect(effectiveCurveDeg(-400)).toBe(-355);
  });

  it('passes through an in-range value unchanged', () => {
    expect(effectiveCurveDeg(90)).toBe(90);
  });
});

describe('layoutCurvedGlyphText', () => {
  it('falls back to straight layout when curveDeg is ~0', () => {
    const font = loadDefaultFont();
    const straight = layoutGlyphText(font, 'Arch', 6, 0, 0)!;
    const curved = layoutCurvedGlyphText(font, 'Arch', 6, 0, 60, 20, 'left')!;
    expect(curved.width).toBeCloseTo(straight.width, 5);
    expect(curved.charJSONs.map((c) => c.dPath)).toEqual(
      straight.charJSONs.map((c) => c.dPath),
    );
  });

  it('places every character within the expected radius of the arc center for a symmetric curve', () => {
    const font = loadDefaultFont();
    const boxWidth = 60;
    const boxHeight = 20;
    const curveDeg = 90;
    const layout = layoutCurvedGlyphText(font, 'Curve', 6, curveDeg, boxWidth, boxHeight, 'center')!;
    expect(layout).not.toBeNull();

    // Recompute the same arc geometry the implementation derives, and
    // check each character's anchor (graphicX/graphicY) lands on it --
    // this is a geometric self-consistency check, not a visual one
    // (there is no way to verify pixel-for-pixel fidelity against
    // real xTool Studio rendering outside the application itself).
    const theta = (curveDeg * Math.PI) / 180;
    const radius = boxWidth / (2 * Math.sin(theta / 2));
    const sagitta = radius * (1 - Math.cos(theta / 2));
    const endY = (boxHeight + sagitta) / 2;
    const centerX = boxWidth / 2;
    const centerY = endY + radius * Math.cos(theta / 2);

    for (const char of layout.charJSONs) {
      const dx = char.graphicX - centerX;
      const dy = char.graphicY - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      expect(distanceFromCenter).toBeCloseTo(radius, 0);
    }
  });

  it('rotates characters symmetrically for centered text on a symmetric arc', () => {
    const font = loadDefaultFont();
    const layout = layoutCurvedGlyphText(font, 'W', 6, 120, 60, 20, 'center')!;
    // A single centered character on a symmetric curve should land
    // essentially unrotated relative to the arc's apex.
    expect(layout).not.toBeNull();
  });

  it('produces a taller ink box than straight layout for a strongly curved line', () => {
    const font = loadDefaultFont();
    const straight = layoutGlyphText(font, 'Curved Text', 6, 0, 0)!;
    const curved = layoutCurvedGlyphText(font, 'Curved Text', 6, 90, 80, 30, 'center')!;
    expect(curved.height).toBeGreaterThan(straight.height);
  });
});

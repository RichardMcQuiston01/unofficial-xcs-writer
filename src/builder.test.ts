import { describe, expect, it } from 'vitest';
import { createXCS, XCSGenerator } from './builder.js';
import { loadDefaultFont } from './glyphs.js';
import { layoutGlyphText } from './layout.js';

describe('XCSGenerator', () => {
  it('generates a project with the required top-level fields', () => {
    const project = createXCS('P2S').generate();
    expect(project.canvas).toHaveLength(1);
    expect(project.extId).toBe('P2S');
    expect(project.device.id).toBe('P2S');
    expect(typeof project.canvasId).toBe('string');
    expect(project.canvasId.length).toBeGreaterThan(0);
  });

  it('adds a PATH display with the given geometry', () => {
    const generator = new XCSGenerator();
    generator.addPath('M0 0L10 0L10 10L0 10Z', 5, 5, 10, 10);
    const project = generator.generate();
    const [display] = project.canvas[0].displays;
    expect(display.type).toBe('PATH');
    expect(display.x).toBe(5);
    expect(display.width).toBe(10);
  });

  it('adds a TEXT display with real glyph outlines when given a layout', () => {
    const font = loadDefaultFont();
    const layout = layoutGlyphText(font, 'Hi', 6, 3, 4)!;
    const generator = new XCSGenerator();
    generator.addText('Hi', 3, 4, { fontFamily: 'Arial', layout });
    const project = generator.generate();
    const display = project.canvas[0].displays[0] as unknown as {
      type: string;
      charJSONs: unknown[];
      x: number;
    };
    expect(display.type).toBe('TEXT');
    expect(display.charJSONs).toHaveLength(2); // 'H' and 'i'
    expect(display.x).toBeCloseTo(3, 5);
  });

  it('adds a BITMAP display scaled to the given physical size', () => {
    const generator = new XCSGenerator();
    generator.addBitmap('AAAA', 0, 0, 20, 10, 200, 100);
    const project = generator.generate();
    const display = project.canvas[0].displays[0] as unknown as {
      type: string;
      width: number;
      height: number;
    };
    expect(display.type).toBe('BITMAP');
    expect(display.width).toBe(20);
    expect(display.height).toBe(10);
  });

  it('assigns increasing zOrder as displays are added', () => {
    const generator = new XCSGenerator();
    generator.addPath('M0 0Z', 0, 0, 1, 1);
    generator.addPath('M0 0Z', 0, 0, 1, 1);
    const project = generator.generate();
    const [first, second] = project.canvas[0].displays;
    expect(second.zOrder).toBeGreaterThan(first.zOrder);
  });

  it('round-trips through toJSON/toBytes as valid JSON with matching content', () => {
    const generator = createXCS().addPath('M0 0Z', 0, 0, 1, 1);
    const json = generator.toJSON();
    const parsedFromJson = JSON.parse(json);
    expect(parsedFromJson.canvas[0].displays[0].dPath).toBe('M0 0Z');

    // toBytes() calls generate() again, which mints a fresh
    // timestamp/UUID each time -- so it's checked for well-formed,
    // equivalent *content*, not byte-for-byte equality with json.
    const bytes = generator.toBytes();
    const parsedFromBytes = JSON.parse(new TextDecoder().decode(bytes));
    expect(parsedFromBytes.canvas[0].displays[0].dPath).toBe('M0 0Z');
    expect(parsedFromBytes.extId).toBe(parsedFromJson.extId);
  });
});

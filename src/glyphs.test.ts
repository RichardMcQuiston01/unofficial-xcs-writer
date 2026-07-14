import { describe, expect, it } from 'vitest';
import { loadDefaultFont, layoutText } from './glyphs.js';
import { renderXcsFile } from './xcs.js';
import type { XcsProject } from './types.js';
import { ARIMO_REGULAR_WOFF_BASE64 } from './assets/arimo-regular.js';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const PLACEHOLDER_D_PATH = 'M0 0L10 0L10 10L0 10Z';

describe('layoutText', () => {
  it('produces one charJSON per non-whitespace character', () => {
    const font = loadDefaultFont();
    const result = layoutText(font, 'Hi there', 0, 0);
    expect(result.charJSONs).toHaveLength('Hi there'.replaceAll(' ', '').length);
  });

  it('gives each distinct character a distinct, non-placeholder dPath', () => {
    const font = loadDefaultFont();
    const result = layoutText(font, 'Smith', 0, 0);
    const paths = result.charJSONs.map((c) => c.dPath);
    expect(new Set(paths).size).toBeGreaterThan(1);
    for (const path of paths) {
      expect(path).not.toBe(PLACEHOLDER_D_PATH);
      expect(path.length).toBeGreaterThan(0);
    }
  });

  it('lays out characters left-to-right with increasing x', () => {
    const font = loadDefaultFont();
    const result = layoutText(font, 'ABC', 0, 0);
    const xs = result.charJSONs.map((c) => c.graphicX);
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[2]).toBeGreaterThan(xs[1]);
  });

  it('anchors the first character at the given origin', () => {
    const font = loadDefaultFont();
    const result = layoutText(font, 'Smith', 12.5, 30);
    expect(result.charJSONs[0].x).toBeCloseTo(12.5, 5);
    expect(result.charJSONs[0].y).toBeCloseTo(30, 5);
    expect(result.x).toBeCloseTo(12.5, 5);
    expect(result.y).toBeCloseTo(30, 5);
  });

  it('handles empty and whitespace-only text without throwing', () => {
    const font = loadDefaultFont();
    expect(layoutText(font, '', 0, 0).charJSONs).toHaveLength(0);
    expect(layoutText(font, '   ', 0, 0).charJSONs).toHaveLength(0);
  });

  it('reuses glyph data for repeated characters', () => {
    const font = loadDefaultFont();
    const result = layoutText(font, 'aaa', 0, 0);
    expect(Object.keys(result.fontData.glyphData)).toEqual(['a']);
    expect(result.charJSONs).toHaveLength(3);
  });
});

function buildProject(text: string): XcsProject {
  return {
    canvasId: 'c1',
    canvas: [
      {
        displays: [
          {
            type: 'TEXT',
            text,
            x: 10,
            y: 20,
            width: 50,
            height: 10,
            style: { fontFamily: 'Arial', fontSize: 72 },
            fontData: {
              fontInfo: {
                unitsPerEm: 2000,
                lineHeight: 30.48,
                ascent: 25.0698,
                descent: -5.4102,
                capHeight: 18.1991,
                xHeight: 12.8651,
                lineGap: 0,
              },
              glyphData: Object.fromEntries(
                [...new Set(text.replace(/\{\{[^}]+\}\}/g, ''))].map((char) => [
                  char,
                  {
                    dPath: PLACEHOLDER_D_PATH,
                    advanceWidth: 15,
                    advanceHeight: 25.4,
                    leftBearing: 0.5,
                    topBearing: 2.2,
                    bbox: { minX: 0, minY: 0, maxX: 15, maxY: 18.2 },
                  },
                ])
              ),
            },
            charJSONs: [],
          },
          {
            type: 'TEXT',
            text: 'Static caption, no tokens',
            x: 0,
            y: 0,
            charJSONs: [{ id: 'preexisting', dPath: 'M1 1L2 2Z' }],
          },
        ],
      },
    ],
  };
}

describe('renderXcsFile glyph regeneration', () => {
  it('regenerates charJSONs with real glyph shapes for a substituted display', () => {
    const project = buildProject('Dear {{LastName}}');
    const buffer = new TextEncoder().encode(JSON.stringify(project)).buffer;

    const rendered = renderXcsFile(
      buffer as ArrayBuffer,
      [{ token: 'LastName' }],
      { LastName: 'Smith' }
    );
    const result = JSON.parse(new TextDecoder().decode(rendered)) as XcsProject;
    const display = result.canvas[0].displays[0];

    expect(display.text).toBe('Dear Smith');
    const charJSONs = display.charJSONs as Array<{ dPath: string }>;
    expect(charJSONs.length).toBe('Dear Smith'.replaceAll(' ', '').length);
    for (const c of charJSONs) {
      expect(c.dPath).not.toBe(PLACEHOLDER_D_PATH);
    }
  });

  it('leaves TEXT displays with no token substitution untouched', () => {
    const project = buildProject('Dear {{LastName}}');
    const buffer = new TextEncoder().encode(JSON.stringify(project)).buffer;

    const rendered = renderXcsFile(
      buffer as ArrayBuffer,
      [{ token: 'LastName' }],
      { LastName: 'Smith' }
    );
    const result = JSON.parse(new TextDecoder().decode(rendered)) as XcsProject;
    const untouched = result.canvas[0].displays[1];

    expect(untouched.charJSONs).toEqual([{ id: 'preexisting', dPath: 'M1 1L2 2Z' }]);
  });

  it('threads a caller-supplied font buffer through to real glyph output', () => {
    const project = buildProject('{{Name}}');
    const buffer = new TextEncoder().encode(JSON.stringify(project)).buffer;
    const suppliedFont = base64ToArrayBuffer(ARIMO_REGULAR_WOFF_BASE64);

    const rendered = renderXcsFile(
      buffer as ArrayBuffer,
      [{ token: 'Name' }],
      { Name: 'A' },
      { Arial: suppliedFont }
    );
    const result = JSON.parse(new TextDecoder().decode(rendered)) as XcsProject;
    const display = result.canvas[0].displays[0];
    const charJSONs = display.charJSONs as Array<{ dPath: string }>;

    expect(charJSONs).toHaveLength(1);
    expect(charJSONs[0].dPath).not.toBe(PLACEHOLDER_D_PATH);
    expect(charJSONs[0].dPath.length).toBeGreaterThan(0);
  });
});

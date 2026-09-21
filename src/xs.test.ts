import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { assertXsFormat, extractXsTokens, renderXsFile, buildXsArchive } from './xs.js';
import { createXCS } from './builder.js';
import { loadDefaultFont } from './glyphs.js';
import { layoutGlyphText } from './layout.js';
import type { XsDisplaysChunk } from './types.js';

const SAMPLES_DIR = fileURLToPath(new URL('../xs_samples/', import.meta.url));

function loadSample(name: string): ArrayBuffer {
  const bytes = readFileSync(`${SAMPLES_DIR}${name}`);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function displaysChunks(buffer: ArrayBuffer): XsDisplaysChunk[] {
  const entries = unzipSync(new Uint8Array(buffer));
  return Object.entries(entries)
    .filter(([path]) => /^canvases\/[^/]+\/displays-\d+\.json$/.test(path))
    .map(([, data]) => JSON.parse(new TextDecoder().decode(data)) as XsDisplaysChunk);
}

describe('assertXsFormat', () => {
  it('accepts a real .xs v2 archive', () => {
    expect(() => assertXsFormat(loadSample('EditableText.xs'))).not.toThrow();
  });

  it('rejects a plain .xcs JSON buffer', () => {
    const notAZip = new TextEncoder().encode('{"canvasId":"x","canvas":[]}').buffer;
    expect(() => assertXsFormat(notAZip)).toThrow(/Not a valid \.xs file/);
  });
});

describe('extractXsTokens', () => {
  it('finds the token in a TEXT display', () => {
    expect(extractXsTokens(loadSample('EditableText.xs'))).toEqual(['Name']);
  });

  it('returns no tokens for archives with no TEXT displays', () => {
    expect(extractXsTokens(loadSample('MadeWithLoveEngraveable.xs'))).toEqual([]);
    expect(extractXsTokens(loadSample('BirthdaySign.xs'))).toEqual([]);
  });
});

describe('renderXsFile', () => {
  it('substitutes the token text and regenerates glyph data', () => {
    const buffer = loadSample('EditableText.xs');
    const before = displaysChunks(buffer)[0].displays[0];

    const rendered = renderXsFile(buffer, [{ token: 'Name' }], { Name: 'World' });

    const after = displaysChunks(rendered.slice().buffer)[0].displays[0];
    expect(after.text).toBe('Hello World');
    expect(after.text).not.toBe(before.text);
    expect((after.charJSONs as unknown[]).length).toBeGreaterThan(0);
  });

  it('leaves every other archive entry byte-for-byte unchanged', () => {
    const buffer = loadSample('EditableText.xs');
    const beforeEntries = unzipSync(new Uint8Array(buffer));

    const rendered = renderXsFile(buffer, [{ token: 'Name' }], { Name: 'World' });
    const afterEntries = unzipSync(rendered);

    for (const [path, data] of Object.entries(beforeEntries)) {
      if (/^canvases\/[^/]+\/displays-\d+\.json$/.test(path)) continue;
      expect(afterEntries[path]).toEqual(data);
    }
  });

  it('leaves text unchanged (and returns a re-zippable archive) when no variables match', () => {
    const buffer = loadSample('MadeWithLoveEngraveable.xs');
    const rendered = renderXsFile(buffer, [{ token: 'Unused' }], { Unused: 'x' });
    expect(() => unzipSync(rendered)).not.toThrow();
  });
});

describe('buildXsArchive (via XCSGenerator.toXsBytes)', () => {
  it('produces a valid .xs archive with the built displays', () => {
    const font = loadDefaultFont();
    const layout = layoutGlyphText(font, 'Hello {{Name}}', 6, 3, 4)!;
    const generator = createXCS('P2S').addText('Hello {{Name}}', 3, 4, {
      fontFamily: 'Arial',
      layout,
    });

    const bytes = generator.toXsBytes();
    const buffer = bytes.slice().buffer;

    expect(() => assertXsFormat(buffer)).not.toThrow();
    expect(extractXsTokens(buffer)).toEqual(['Name']);

    const chunks = displaysChunks(buffer);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].displays[0].text).toBe('Hello {{Name}}');
    expect(chunks[0].displays[0].type).toBe('TEXT');
  });

  it('substitutes tokens through renderXsFile the same as a real .xs file', () => {
    const font = loadDefaultFont();
    const layout = layoutGlyphText(font, 'Hello {{Name}}', 6, 3, 4)!;
    const buffer = createXCS()
      .addText('Hello {{Name}}', 3, 4, { fontFamily: 'Arial', layout })
      .toXsBytes().slice().buffer;

    const rendered = renderXsFile(buffer, [{ token: 'Name' }], { Name: 'World' });
    const after = displaysChunks(rendered.slice().buffer)[0].displays[0];
    expect(after.text).toBe('Hello World');
  });

  it('includes the cover image as a real PNG resource, not inline base64', () => {
    const buffer = createXCS().addPath('M0 0Z', 0, 0, 1, 1).toXsBytes().slice().buffer;
    const entries = unzipSync(new Uint8Array(buffer));

    const cover = entries['resources/project-cover.png'];
    expect(cover).toBeDefined();
    // PNG magic bytes.
    expect(Array.from(cover.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const meta = JSON.parse(new TextDecoder().decode(entries['resources/project-cover.png.meta.json']));
    expect(meta.ref).toBe('resources/project-cover.png');
    expect(meta.metadata.mimeType).toBe('image/png');

    const project = JSON.parse(new TextDecoder().decode(entries['project.json']));
    expect(project.cover).toBe('resources/project-cover.png');
  });

  it('throws when building from a project with no canvas', () => {
    const emptyProject = createXCS().generate();
    expect(() => buildXsArchive({ ...emptyProject, canvas: [] })).toThrow(/no canvas/);
  });
});

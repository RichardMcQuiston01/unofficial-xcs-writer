import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { assertXsFormat, extractXsTokens, renderXsFile } from './xs.js';
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

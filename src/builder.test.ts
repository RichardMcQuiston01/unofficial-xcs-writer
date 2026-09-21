import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createXCS, XCSGenerator } from './builder.js';
import { loadDefaultFont } from './glyphs.js';
import { layoutGlyphText } from './layout.js';
import { XTOOL_MACHINES, type MachineProfile } from './machines.js';

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

  it('exports a valid .xs archive via toXsBytes with the same displays as toBytes', () => {
    const generator = createXCS().addPath('M0 0Z', 0, 0, 1, 1);

    const xcs = JSON.parse(new TextDecoder().decode(generator.toBytes()));
    const entries = unzipSync(generator.toXsBytes());
    const canvasId = xcs.canvasId as string;
    const displaysChunk = JSON.parse(
      new TextDecoder().decode(entries[`canvases/${canvasId}/displays-0.json`])
    );

    expect(displaysChunk.displays[0].dPath).toBe('M0 0Z');
    expect(new TextDecoder().decode(entries['.format'])).toBe('v2');
  });
});

describe('machine identity', () => {
  it('resolves a known machine name to its real extId/extName/power', () => {
    const project = createXCS('F2 Ultra UV').generate();
    expect(project.extId).toBe('GS009-CLASS-4');
    expect(project.extName).toBe('F2 Ultra UV');
    expect(project.device.id).toBe('GS009-CLASS-4');
    expect(project.device.power).toBe(5);
  });

  it('treats an unknown device id as a raw id, matching pre-catalog behavior', () => {
    const project = createXCS('SomeCustomDevice').generate();
    expect(project.extId).toBe('SomeCustomDevice');
    expect(project.extName).toBe('SomeCustomDevice');
    expect(project.device.power).toBe(55);
  });

  it('lets an explicit devicePower override the machine default', () => {
    const project = new XCSGenerator({ deviceId: 'F2 Ultra UV', devicePower: 30 }).generate();
    expect(project.device.power).toBe(30);
  });

  it('accepts a MachineProfile supplied directly', () => {
    const machine: MachineProfile = {
      name: 'Custom M1',
      extId: 'CUSTOM-M1',
      extName: 'Custom M1',
      deviceCode: 'ABC123',
      defaultPower: 40,
    };
    const project = new XCSGenerator({ deviceId: machine }).generate();
    expect(project.extId).toBe('CUSTOM-M1');
    expect(project.extName).toBe('Custom M1');
    expect(project.device.power).toBe(40);
  });

  it("embeds the known machine's real deviceCode in .xs output", () => {
    const entries = unzipSync(createXCS('P2S').toXsBytes());
    const device = JSON.parse(new TextDecoder().decode(entries['devices/device-P2S.json']));
    expect(device.deviceCode).toBe('ZY013');
  });

  it('falls back to the device id as deviceCode for an unknown device id', () => {
    const entries = unzipSync(createXCS('SomeCustomDevice').toXsBytes());
    const device = JSON.parse(
      new TextDecoder().decode(entries['devices/device-SomeCustomDevice.json'])
    );
    expect(device.deviceCode).toBe('SomeCustomDevice');
  });

  it('has exactly the 13 machines verified from real exports', () => {
    expect(Object.keys(XTOOL_MACHINES).sort()).toEqual(
      [
        'P2S',
        'F2 Ultra UV',
        'S1',
        'P3',
        'M2',
        'F2',
        'F2 Ultra (Single)',
        'F2 Ultra',
        'M1 Ultra',
        'F1',
        'F1 Lite',
        'F1 Ultra',
        'MetalFab',
      ].sort()
    );
  });

  it.each([
    ['S1', { extId: 'S1', extName: 'S1', deviceCode: 'MD2', defaultPower: 40 }],
    ['P3', { extId: 'P3', extName: 'P3', deviceCode: 'ZY015', defaultPower: 80 }],
    ['M2', { extId: 'JS002', extName: 'M2', deviceCode: 'JS002', defaultPower: 10 }],
    ['F2', { extId: 'GS006', extName: 'F2', deviceCode: 'GS006', defaultPower: 5 }],
    [
      'F2 Ultra (Single)',
      { extId: 'GS007-CLASS-4', extName: 'F2 Ultra (Single)', deviceCode: 'GS007-CLASS-4', defaultPower: 60 },
    ],
    [
      'F2 Ultra',
      { extId: 'GS004-CLASS-4', extName: 'F2 Ultra', deviceCode: 'GS004-CLASS-4', defaultPower: 60 },
    ],
    ['M1 Ultra', { extId: 'M1Ultra', extName: 'M1 Ultra', deviceCode: 'ZH009', defaultPower: 20 }],
    ['F1', { extId: 'F1', extName: 'F1', deviceCode: 'MF1', defaultPower: 10 }],
    ['F1 Lite', { extId: 'GS005', extName: 'F1 Lite', deviceCode: 'GS005', defaultPower: 10 }],
    ['F1 Ultra', { extId: 'F1Ultra', extName: 'F1 Ultra', deviceCode: 'GS002', defaultPower: 20 }],
    [
      'MetalFab',
      { extId: 'HJ003', extName: 'MetalFab CNC Cutter', deviceCode: 'HJ003', defaultPower: 1200 },
    ],
  ])('resolves %s to its real extId/extName/deviceCode/power', (name, expected) => {
    const project = createXCS(name).generate();
    expect(project.extId).toBe(expected.extId);
    expect(project.extName).toBe(expected.extName);
    expect(project.device.power).toBe(expected.defaultPower);
    expect(XTOOL_MACHINES[name].deviceCode).toBe(expected.deviceCode);
  });
});

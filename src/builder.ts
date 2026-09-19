import type { CharJson, FontData, GlyphData } from './glyphs.js';
import type { GlyphTextLayout } from './layout.js';

/**
 * Generates xTool Creative Space (.xcs) project files from scratch --
 * the "build" counterpart to `xcs.ts`'s read/substitute API. A
 * project is a canvas holding TEXT/PATH/BITMAP display objects plus a
 * few required top-level fields xTool Studio expects on load.
 *
 * Ported from `maker-toolkit`'s `apps/desktop/src/shared/xcs/generator.ts`
 * (see that repo's `planning/ROADMAP.md` "XCS generator consolidation"
 * note) -- this was previously duplicated per-consumer since this
 * package had no generation API yet.
 */

export interface XCSGeneratorOptions {
  deviceId?: string;
  devicePower?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface Layer {
  name: string;
  order: number;
  visible: boolean;
}

export interface FillStroke {
  paintType: string;
  visible: boolean;
  color: number;
  alpha: number;
  width?: number;
  cap?: string;
  join?: string;
  miterLimit?: number;
  alignment?: number;
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontSubfamily: string;
  fontSource: string;
  letterSpacing: number;
  leading: number;
  align: string;
  curveX: number;
  curveY: number;
  isUppercase: boolean;
  isWeld: boolean;
  direction: string;
  writingMode: string;
  textOrientation: string;
}

export interface DisplayObject {
  id: string;
  name: string | null;
  type: 'TEXT' | 'PATH' | 'IMAGE' | 'BITMAP';
  x: number;
  y: number;
  angle: number;
  scale: { x: number; y: number };
  skew: { x: number; y: number };
  pivot: { x: number; y: number };
  localSkew: { x: number; y: number };
  offsetX: number;
  offsetY: number;
  lockRatio: boolean;
  isClosePath: boolean;
  zOrder: number;
  groupTag: string;
  layerTag: string;
  layerColor: string;
  visible: boolean;
  originColor: string;
  enableTransform: boolean;
  visibleState: boolean;
  lockState: boolean;
  resourceOrigin: string;
  customData: Record<string, unknown>;
  rootComponentId: string;
  minCanvasVersion: string;
  fill: FillStroke;
  stroke: FillStroke;
  width: number;
  height: number;
  isFill: boolean;
  lineColor: number;
  fillColor: string;
  fillRule?: string;
}

export interface TextDisplayObject extends DisplayObject {
  type: 'TEXT';
  text: string;
  resolution: number;
  style: TextStyle;
  fontData: FontData;
  /** One PATH per character with real glyph outlines (mm). */
  charJSONs: CharJson[];
}

export interface PathDisplayObject extends DisplayObject {
  type: 'PATH';
  points: unknown[];
  dPath: string; // SVG path data
  fillRule: string;
  graphicX: number;
  graphicY: number;
  isCompoundPath: boolean;
}

/**
 * An embedded raster image. Field set mirrors what xTool Studio
 * writes; the single-JSON .xcs format carries the image inline as a
 * data URL in `url`/`currentUrl`.
 */
export interface BitmapDisplayObject extends DisplayObject {
  type: 'BITMAP';
  alpha: number;
  grayValue: [number, number];
  sharpness: number;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tone: number;
  colorInverted: boolean;
  /** Source pixel dimensions. */
  originWidth: number;
  originHeight: number;
  /** Image as a data URL (legacy inline embedding). */
  url: string;
  currentUrl: string;
  dpi: { dpiX: number; dpiY: number };
  isGray: boolean;
  opacity: number;
}

export interface ExtendInfo {
  version: string;
  minCanvasVersion: string;
  displayProcessConfigMap: Record<string, unknown>;
  rulerPluginData: {
    rulerGuide: unknown[];
  };
  gridOptions: {
    color: string;
    isShow: boolean;
  };
}

export interface Canvas {
  id: string;
  title: string;
  layerData: Record<string, Layer>;
  groupData: Record<string, unknown>;
  displays: DisplayObject[];
  extendInfo: ExtendInfo;
}

export interface Device {
  id: string;
  power: number;
  data: {
    dataType: string;
    value: unknown[];
  };
  materialList: unknown[];
  materialTypeList: unknown[];
  customProjectData: Record<string, unknown>;
}

export interface XCSFile {
  canvasId: string;
  canvas: Canvas[];
  extId: string;
  extName: string;
  device: Device;
  version: string;
  created: number;
  modify: number;
  ua: string;
  meta: unknown[];
  cover: string; // Base64 encoded PNG
  minRequiredVersion: string;
  appMinRequiredVersion: string;
  webMinRequiredVersion: string;
  projectTraceID: string;
}

export class XCSGenerator {
  private canvasId: string;
  private canvas: Canvas;
  private displays: DisplayObject[] = [];
  private layers: Map<string, Layer> = new Map();
  private options: Required<XCSGeneratorOptions>;

  constructor(options: XCSGeneratorOptions = {}) {
    this.options = {
      deviceId: options.deviceId || 'P2S',
      devicePower: options.devicePower || 55,
      canvasWidth: options.canvasWidth || 400,
      canvasHeight: options.canvasHeight || 400,
    };

    this.canvasId = this.generateUUID();
    this.canvas = this.createCanvas();

    // Add default cyan layer
    this.addLayer('#00befe', '{Cyan}', 1);
  }

  /**
   * Add a text object to the canvas. Pass `layout` (built via
   * `layoutGlyphText`/`layoutMultilineGlyphText`/`layoutCurvedGlyphText`
   * from a real font) so xTool Studio renders actual glyph outlines;
   * without it the text carries placeholder glyph data that renders
   * as blocks.
   */
  addText(
    text: string,
    x: number,
    y: number,
    options: Partial<{
      fontSize: number;
      fontFamily: string;
      align: 'left' | 'center' | 'right';
      /** In points, like fontSize. */
      letterSpacing: number;
      layerColor: string;
      fillColor: string;
      lineColor: number;
      angle: number;
      layout: GlyphTextLayout;
    }> = {},
  ): this {
    const textObj = this.createTextObject(text, x, y, options);
    this.displays.push(textObj);
    return this;
  }

  /**
   * Add a path object to the canvas
   */
  addPath(
    pathData: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: Partial<{
      layerColor: string;
      fillColor: string;
      lineColor: number;
      isFill: boolean;
      angle: number;
    }> = {},
  ): this {
    const pathObj = this.createPathObject(pathData, x, y, width, height, options);
    this.displays.push(pathObj);
    return this;
  }

  /**
   * Add an embedded PNG image, displayed at widthMm x heightMm with
   * its top-left at (x, y). Field set mirrors xTool Studio's own
   * BITMAP displays; the image travels inline as a data URL.
   */
  addBitmap(
    pngBase64: string,
    x: number,
    y: number,
    widthMm: number,
    heightMm: number,
    originWidthPx: number,
    originHeightPx: number,
    options: Partial<{ layerColor: string; angle: number }> = {},
  ): this {
    const layerColor = options.layerColor || '#00befe';
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const scaleX = originWidthPx > 0 ? widthMm / originWidthPx : 1;
    const scaleY = originHeightPx > 0 ? heightMm / originHeightPx : 1;
    const bitmap: BitmapDisplayObject = {
      id: this.generateUUID(),
      name: null,
      type: 'BITMAP',
      x,
      y,
      angle: options.angle || 0,
      scale: { x: scaleX, y: scaleY },
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      localSkew: { x: 0, y: 0 },
      offsetX: x,
      offsetY: y,
      lockRatio: true,
      isClosePath: false,
      zOrder: this.displays.length,
      groupTag: this.generateUUID(),
      layerTag: layerColor,
      layerColor,
      visible: true,
      originColor: '#000000',
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: '',
      customData: {},
      rootComponentId: '',
      minCanvasVersion: '0.0.0',
      alpha: 1,
      fill: {
        paintType: 'color',
        visible: false,
        color: 0,
        alpha: 1,
      },
      stroke: {
        paintType: 'color',
        visible: false,
        color: 0,
        alpha: 1,
        width: 1,
        cap: 'butt',
        join: 'miter',
        miterLimit: 4,
        alignment: 0.5,
      },
      width: widthMm,
      height: heightMm,
      isFill: true,
      lineColor: 0,
      fillColor: '#000000',
      grayValue: [0, 255],
      sharpness: 50,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tone: 0,
      colorInverted: false,
      originWidth: originWidthPx,
      originHeight: originHeightPx,
      url: dataUrl,
      currentUrl: dataUrl,
      dpi: {
        dpiX: scaleX > 0 ? 25.4 / scaleX : 96,
        dpiY: scaleY > 0 ? 25.4 / scaleY : 96,
      },
      isGray: false,
      opacity: 1,
    };
    this.displays.push(bitmap);
    return this;
  }

  /**
   * Add a layer to the canvas
   */
  addLayer(color: string, name: string, order: number): this {
    this.layers.set(color, {
      name,
      order,
      visible: true,
    });
    return this;
  }

  /**
   * Generate the complete XCS file
   */
  generate(): XCSFile {
    // Update canvas with displays
    this.canvas.displays = this.displays;
    this.canvas.layerData = Object.fromEntries(this.layers);

    const now = Date.now();

    return {
      canvasId: this.canvasId,
      canvas: [this.canvas],
      extId: this.options.deviceId,
      extName: this.options.deviceId,
      device: {
        id: this.options.deviceId,
        power: this.options.devicePower,
        data: {
          dataType: 'Map',
          value: [],
        },
        materialList: [],
        materialTypeList: [],
        customProjectData: {},
      },
      version: '1.1.10',
      created: now,
      modify: now,
      ua: 'unofficial-xcs-writer',
      meta: [],
      cover: this.generatePreviewImage(),
      minRequiredVersion: '2.6.0',
      appMinRequiredVersion: '',
      webMinRequiredVersion: '',
      projectTraceID: this.generateUUID(),
    };
  }

  /**
   * Export as JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.generate());
  }

  /**
   * Export as a UTF-8 byte array, matching `renderXcsFile`'s output type.
   */
  toBytes(): Uint8Array {
    return new TextEncoder().encode(this.toJSON());
  }

  private createCanvas(): Canvas {
    return {
      id: this.canvasId,
      title: '{panel}1',
      layerData: {},
      groupData: {},
      displays: [],
      extendInfo: {
        version: '2.15.17',
        minCanvasVersion: '0.0.0',
        displayProcessConfigMap: {},
        rulerPluginData: {
          rulerGuide: [],
        },
        gridOptions: {
          color: 'normal',
          isShow: true,
        },
      },
    };
  }

  private createTextObject(
    text: string,
    x: number,
    y: number,
    options: Partial<{
      fontSize: number;
      fontFamily: string;
      align: 'left' | 'center' | 'right';
      letterSpacing: number;
      layerColor: string;
      fillColor: string;
      lineColor: number;
      angle: number;
      layout: GlyphTextLayout;
    }>,
  ): TextDisplayObject {
    const fontSize = options.fontSize || 72;
    const fontFamily = options.fontFamily || 'Lato';
    const layerColor = options.layerColor || '#00befe';
    const fillColor = options.fillColor || '#f9932b';
    const lineColor = options.lineColor || 0xfaa51c;
    const layout = options.layout;

    // Real glyph layout when provided; else the legacy placeholder
    // data with an approximated box.
    const fontData = layout ? layout.fontData : this.createSimpleFontData(text);
    const width = layout ? layout.width : text.length * fontSize * 0.6;
    const height = layout ? layout.height : fontSize * 0.3;
    let anchorX = x;
    let anchorY = y;
    if (layout) {
      anchorX = layout.x;
      anchorY = layout.y;
    }

    return {
      id: this.generateUUID(),
      name: null,
      type: 'TEXT',
      x: anchorX,
      y: anchorY,
      angle: options.angle || 0,
      scale: { x: 1, y: 1 },
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      localSkew: { x: 0, y: 0 },
      offsetX: anchorX,
      // Real layouts anchor at the ink box top-left (matching xTool
      // Studio's own files); the legacy path keeps its baseline-ish
      // offset.
      offsetY: layout ? anchorY : anchorY + height,
      lockRatio: true,
      isClosePath: true,
      zOrder: this.displays.length + 1,
      groupTag: this.generateUUID(),
      layerTag: layerColor,
      layerColor,
      visible: true,
      originColor: '#000000',
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: '',
      customData: {},
      rootComponentId: '',
      minCanvasVersion: '0.0.0',
      fill: {
        paintType: 'color',
        visible: false,
        color: 0,
        alpha: 1,
      },
      stroke: {
        paintType: 'color',
        visible: true,
        color: 0,
        alpha: 1,
        width: 1,
        cap: 'butt',
        join: 'miter',
        miterLimit: 4,
        alignment: 0.5,
      },
      width,
      height,
      isFill: true,
      lineColor,
      fillColor,
      text,
      resolution: 1,
      // Style mirrors what xTool Studio itself writes; fontSource
      // 'system' avoids the missing-built-in-font warning for fonts
      // xTool doesn't bundle. curveX/curveY are edit-mode UI state --
      // xTool Studio only trusts the stored charJSONs for rendering
      // (see glyphs.ts), so a curved layout's baked-in glyph shapes
      // render correctly regardless of these two values.
      style: {
        fontSize,
        fontFamily,
        fontSubfamily: 'Regular',
        fontSource: 'system',
        letterSpacing: options.letterSpacing || 0,
        leading: 0,
        align: options.align || 'center',
        curveX: 56,
        curveY: 0,
        isUppercase: false,
        isWeld: false,
        direction: 'auto',
        writingMode: 'horizontal-tb',
        textOrientation: 'mixed',
      },
      fontData,
      charJSONs: layout ? layout.charJSONs : [],
      fillRule: 'nonzero',
    };
  }

  private createPathObject(
    pathData: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: Partial<{
      layerColor: string;
      fillColor: string;
      lineColor: number;
      isFill: boolean;
      angle: number;
    }>,
  ): PathDisplayObject {
    const layerColor = options.layerColor || '#00befe';
    const fillColor = options.fillColor || '#f9932b';
    const lineColor = options.lineColor || 0xfaa51c;
    const isFill = options.isFill !== undefined ? options.isFill : true;

    return {
      id: this.generateUUID(),
      name: null,
      type: 'PATH',
      x,
      y,
      angle: options.angle || 0,
      scale: { x: 1, y: 1 },
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      localSkew: { x: 0, y: 0 },
      offsetX: x,
      offsetY: y,
      lockRatio: true,
      isClosePath: true,
      zOrder: this.displays.length,
      groupTag: this.generateUUID(),
      layerTag: layerColor,
      layerColor,
      visible: true,
      originColor: '#000000',
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: '',
      customData: {},
      rootComponentId: '',
      minCanvasVersion: '0.0.0',
      fill: {
        paintType: 'color',
        visible: false,
        color: 0,
        alpha: 1,
      },
      stroke: {
        paintType: 'color',
        visible: true,
        color: 0,
        alpha: 1,
        width: 1,
        cap: 'butt',
        join: 'miter',
        miterLimit: 4,
        alignment: 0.5,
      },
      width,
      height,
      isFill,
      lineColor,
      fillColor,
      points: [],
      dPath: pathData,
      fillRule: 'nonzero',
      graphicX: x,
      graphicY: y,
      isCompoundPath: false,
    };
  }

  private createSimpleFontData(text: string): FontData {
    // Placeholder glyph data used only when no real `layout` is
    // supplied -- renders as blocks in xTool Studio. Callers should
    // always pass `layout` (see `layoutGlyphText`) for real text.
    const glyphData: Record<string, GlyphData> = {};

    const uniqueChars = [...new Set(text.split(''))];
    uniqueChars.forEach((char) => {
      glyphData[char] = {
        dPath: 'M0 0L10 0L10 10L0 10Z',
        advanceWidth: 15,
        advanceHeight: 25.4,
        leftBearing: 0.5,
        topBearing: 2.2,
        bbox: {
          minX: 0,
          minY: 0,
          maxX: 15,
          maxY: 18.2,
        },
      };
    });

    return {
      fontInfo: {
        unitsPerEm: 2000,
        lineHeight: 30.48,
        ascent: 25.0698,
        descent: -5.4102,
        capHeight: 18.1991,
        xHeight: 12.8651,
        lineGap: 0,
      },
      glyphData,
    };
  }

  private generatePreviewImage(): string {
    // A simple 1x1 transparent PNG placeholder -- a real preview
    // would need to render the actual canvas content.
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/** Convenience function to create a new, empty XCS project. */
export function createXCS(deviceId = 'P2S'): XCSGenerator {
  return new XCSGenerator({ deviceId });
}

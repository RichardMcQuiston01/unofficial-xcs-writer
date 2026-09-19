import opentype from 'opentype.js';

interface XcsVariable {
    token: string;
    defaultValue?: string;
}
interface XcsDisplay {
    type: string;
    text?: string;
    [key: string]: unknown;
}
interface XcsCanvas {
    displays: XcsDisplay[];
    [key: string]: unknown;
}
interface XcsProject {
    canvasId: string;
    canvas: XcsCanvas[];
    [key: string]: unknown;
}

declare function assertXcsFormat(buffer: ArrayBuffer): void;
declare function readXcsFile(buffer: ArrayBuffer): string;
declare function extractXcsTokens(buffer: ArrayBuffer): string[];
/**
 * Substitutes `{{token}}` placeholders in TEXT display `text` fields.
 *
 * Whenever a display's text actually changes, its glyph outline data
 * (`charJSONs` / `fontData.glyphData`) is regenerated from a real font
 * so xTool Studio renders the new text correctly instead of showing
 * stale or placeholder glyph shapes (see src/glyphs.ts for the format
 * this was reverse-engineered from, and its documented limitations --
 * notably, curved-text layout is not reproduced).
 *
 * Pass `fonts` to supply real font file bytes keyed by the TEXT
 * display's `style.fontFamily`; displays whose font isn't supplied
 * fall back to a bundled metric-compatible default (Arimo, standing in
 * for Arial). Displays whose text doesn't change are left untouched.
 */
declare function renderXcsFile(buffer: ArrayBuffer, variables: XcsVariable[], values: Record<string, string>, fonts?: Record<string, ArrayBuffer>): Uint8Array;

interface GlyphBBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
interface GlyphData {
    dPath: string;
    advanceWidth: number;
    advanceHeight: number;
    leftBearing: number;
    topBearing: number;
    bbox: GlyphBBox;
}
interface FontInfo {
    unitsPerEm: number;
    lineHeight: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
    lineGap: number;
}
interface FontData {
    fontInfo: FontInfo;
    glyphData: Record<string, GlyphData>;
}
interface CharJson {
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
interface TextLayoutResult {
    fontData: FontData;
    charJSONs: CharJson[];
    /** New display x/y (== charJSONs[0]'s box top-left), only present if text is non-empty. */
    x: number | null;
    y: number | null;
    width: number;
    height: number;
}
/** Loads and parses a font file (TTF/OTF/WOFF) for glyph extraction. */
declare function loadFont(buffer: ArrayBuffer): opentype.Font;
/** The bundled fallback font (Arimo, metric-compatible with Arial, Apache-2.0). */
declare function loadDefaultFont(): opentype.Font;
/**
 * Builds glyphData + charJSONs for `text` laid out on a straight
 * horizontal baseline, anchored so the first character's ink
 * bounding-box top-left lands at (originX, originY) -- matching how
 * an xTool Studio TEXT display's own x/y equals charJSONs[0]'s x/y.
 */
declare function layoutText(font: opentype.Font, text: string, originX: number, originY: number): TextLayoutResult;

/** xTool Studio's `style.fontSize` unit is points (72 pt per em). */
declare function fontSizePoints(emSizeMm: number): number;
/** A parsed font usable for glyph extraction. */
type XcsFont = ReturnType<typeof loadFont>;
/** A glyph layout scaled and positioned for one TEXT display. */
interface GlyphTextLayout {
    fontData: FontData;
    charJSONs: CharJson[];
    /** Ink bounding box of the laid-out text, in world mm. */
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Lays out `text` in `font` at `emSizeMm` (the canvas font size, mm
 * per em), anchored so the ink bounding box's top-left lands at
 * (xMm, yMm) in world coordinates. `letterSpacingMm` adds fixed extra
 * advance per character position. Returns null when the text has no
 * ink (empty or whitespace only).
 */
declare function layoutGlyphText(font: XcsFont, text: string, emSizeMm: number, xMm: number, yMm: number, letterSpacingMm?: number): GlyphTextLayout | null;
/**
 * Multi-line layout: each line laid out separately, aligned within
 * the block and vertically centered in its line slot (fontSize x
 * lineHeight), stacked top to bottom. Anchored at (0, 0); block width
 * is the widest line, block height the slots total. Returns null
 * when no line has ink.
 */
declare function layoutMultilineGlyphText(font: XcsFont, text: string, emSizeMm: number, letterSpacingMm: number, lineHeightMult: number, align: 'left' | 'center' | 'right'): GlyphTextLayout | null;
/** The same layout shifted by (dxMm, dyMm) -- cheaper than relaying out. */
declare function translateGlyphLayout(layout: GlyphTextLayout, dxMm: number, dyMm: number): GlyphTextLayout;
/** The effective curve of a textbox; 0 means straight. */
declare function effectiveCurveDeg(curveDeg: number | undefined): number;
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
declare function layoutCurvedGlyphText(font: XcsFont, text: string, emSizeMm: number, curveDeg: number, boxWidthMm: number, boxHeightMm: number, align?: 'left' | 'center' | 'right', letterSpacingMm?: number): GlyphTextLayout | null;

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
interface XCSGeneratorOptions {
    deviceId?: string;
    devicePower?: number;
    canvasWidth?: number;
    canvasHeight?: number;
}
interface Layer {
    name: string;
    order: number;
    visible: boolean;
}
interface FillStroke {
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
interface TextStyle {
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
interface DisplayObject {
    id: string;
    name: string | null;
    type: 'TEXT' | 'PATH' | 'IMAGE' | 'BITMAP';
    x: number;
    y: number;
    angle: number;
    scale: {
        x: number;
        y: number;
    };
    skew: {
        x: number;
        y: number;
    };
    pivot: {
        x: number;
        y: number;
    };
    localSkew: {
        x: number;
        y: number;
    };
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
interface TextDisplayObject extends DisplayObject {
    type: 'TEXT';
    text: string;
    resolution: number;
    style: TextStyle;
    fontData: FontData;
    /** One PATH per character with real glyph outlines (mm). */
    charJSONs: CharJson[];
}
interface PathDisplayObject extends DisplayObject {
    type: 'PATH';
    points: unknown[];
    dPath: string;
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
interface BitmapDisplayObject extends DisplayObject {
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
    dpi: {
        dpiX: number;
        dpiY: number;
    };
    isGray: boolean;
    opacity: number;
}
interface ExtendInfo {
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
interface Canvas {
    id: string;
    title: string;
    layerData: Record<string, Layer>;
    groupData: Record<string, unknown>;
    displays: DisplayObject[];
    extendInfo: ExtendInfo;
}
interface Device {
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
interface XCSFile {
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
    cover: string;
    minRequiredVersion: string;
    appMinRequiredVersion: string;
    webMinRequiredVersion: string;
    projectTraceID: string;
}
declare class XCSGenerator {
    private canvasId;
    private canvas;
    private displays;
    private layers;
    private options;
    constructor(options?: XCSGeneratorOptions);
    /**
     * Add a text object to the canvas. Pass `layout` (built via
     * `layoutGlyphText`/`layoutMultilineGlyphText`/`layoutCurvedGlyphText`
     * from a real font) so xTool Studio renders actual glyph outlines;
     * without it the text carries placeholder glyph data that renders
     * as blocks.
     */
    addText(text: string, x: number, y: number, options?: Partial<{
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
    }>): this;
    /**
     * Add a path object to the canvas
     */
    addPath(pathData: string, x: number, y: number, width: number, height: number, options?: Partial<{
        layerColor: string;
        fillColor: string;
        lineColor: number;
        isFill: boolean;
        angle: number;
    }>): this;
    /**
     * Add an embedded PNG image, displayed at widthMm x heightMm with
     * its top-left at (x, y). Field set mirrors xTool Studio's own
     * BITMAP displays; the image travels inline as a data URL.
     */
    addBitmap(pngBase64: string, x: number, y: number, widthMm: number, heightMm: number, originWidthPx: number, originHeightPx: number, options?: Partial<{
        layerColor: string;
        angle: number;
    }>): this;
    /**
     * Add a layer to the canvas
     */
    addLayer(color: string, name: string, order: number): this;
    /**
     * Generate the complete XCS file
     */
    generate(): XCSFile;
    /**
     * Export as JSON string
     */
    toJSON(): string;
    /**
     * Export as a UTF-8 byte array, matching `renderXcsFile`'s output type.
     */
    toBytes(): Uint8Array;
    private createCanvas;
    private createTextObject;
    private createPathObject;
    private createSimpleFontData;
    private generatePreviewImage;
    private generateUUID;
}
/** Convenience function to create a new, empty XCS project. */
declare function createXCS(deviceId?: string): XCSGenerator;

export { type BitmapDisplayObject, type Canvas, type CharJson, type Device, type DisplayObject, type ExtendInfo, type FillStroke, type FontData, type FontInfo, type GlyphBBox, type GlyphData, type GlyphTextLayout, type Layer, type PathDisplayObject, type TextDisplayObject, type TextLayoutResult, type TextStyle, type XCSFile, XCSGenerator, type XCSGeneratorOptions, type XcsCanvas, type XcsDisplay, type XcsFont, type XcsProject, type XcsVariable, assertXcsFormat, createXCS, effectiveCurveDeg, extractXcsTokens, fontSizePoints, layoutCurvedGlyphText, layoutGlyphText, layoutMultilineGlyphText, layoutText, loadDefaultFont, loadFont, readXcsFile, renderXcsFile, translateGlyphLayout };

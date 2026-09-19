"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  XCSGenerator: () => XCSGenerator,
  assertXcsFormat: () => assertXcsFormat,
  createXCS: () => createXCS,
  effectiveCurveDeg: () => effectiveCurveDeg,
  extractXcsTokens: () => extractXcsTokens,
  fontSizePoints: () => fontSizePoints,
  layoutCurvedGlyphText: () => layoutCurvedGlyphText,
  layoutGlyphText: () => layoutGlyphText,
  layoutMultilineGlyphText: () => layoutMultilineGlyphText,
  layoutText: () => layoutText,
  loadDefaultFont: () => loadDefaultFont,
  loadFont: () => loadFont,
  readXcsFile: () => readXcsFile,
  renderXcsFile: () => renderXcsFile,
  translateGlyphLayout: () => translateGlyphLayout
});
module.exports = __toCommonJS(index_exports);

// src/glyphs.ts
var import_opentype = __toESM(require("opentype.js"), 1);

// src/assets/arimo-regular.ts
var ARIMO_REGULAR_WOFF_BASE64 = "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";

// src/glyphs.ts
var MM_PER_EM = 25.4;
var cachedDefaultFont = null;
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
function loadFont(buffer) {
  return import_opentype.default.parse(buffer);
}
function loadDefaultFont() {
  if (!cachedDefaultFont) {
    cachedDefaultFont = loadFont(base64ToArrayBuffer(ARIMO_REGULAR_WOFF_BASE64));
  }
  return cachedDefaultFont;
}
function scaleFor(font) {
  return MM_PER_EM / font.unitsPerEm;
}
function fontInfoFor(font) {
  const scale = scaleFor(font);
  const os2 = font.tables["os2"];
  const capHeight = os2?.sCapHeight ?? Math.round(font.unitsPerEm * 0.7);
  const xHeight = os2?.sxHeight ?? Math.round(font.unitsPerEm * 0.5);
  return {
    unitsPerEm: font.unitsPerEm,
    lineHeight: (font.ascender - font.descender) * scale,
    ascent: font.ascender * scale,
    descent: font.descender * scale,
    capHeight: capHeight * scale,
    xHeight: xHeight * scale,
    lineGap: 0
  };
}
function isEmptyGlyph(glyph) {
  const path = glyph.path;
  return !path || path.commands.length === 0;
}
function pathToDString(path, scale) {
  const fmt = (n) => {
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };
  const parts = [];
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`);
        break;
      case "L":
        parts.push(`L${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`);
        break;
      case "Q":
        parts.push(
          `Q${fmt(cmd.x1 * scale)} ${fmt(-cmd.y1 * scale)} ${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`
        );
        break;
      case "C":
        parts.push(
          `C${fmt(cmd.x1 * scale)} ${fmt(-cmd.y1 * scale)} ${fmt(cmd.x2 * scale)} ${fmt(-cmd.y2 * scale)} ${fmt(cmd.x * scale)} ${fmt(-cmd.y * scale)}`
        );
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }
  return parts.join("");
}
function bboxFor(path, scale) {
  const box = path.getBoundingBox();
  return {
    minX: box.x1 * scale,
    minY: box.y1 * scale,
    maxX: box.x2 * scale,
    maxY: box.y2 * scale
  };
}
function generateUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function layoutText(font, text, originX, originY) {
  const scale = scaleFor(font);
  const fontInfo = fontInfoFor(font);
  const glyphData = {};
  const charJSONs = [];
  let graphicX = null;
  let graphicY = originY;
  let firstBox = null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const char of text) {
    const glyph = font.charToGlyph(char);
    const advanceWidth = (glyph.advanceWidth ?? 0) * scale;
    if (!glyphData[char]) {
      const path = glyph.path;
      if (isEmptyGlyph(glyph)) {
        glyphData[char] = {
          dPath: "",
          advanceWidth,
          advanceHeight: fontInfo.lineHeight,
          leftBearing: 0,
          topBearing: 0,
          bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        };
      } else {
        const bbox = bboxFor(path, scale);
        glyphData[char] = {
          dPath: pathToDString(path, scale),
          advanceWidth,
          advanceHeight: fontInfo.lineHeight,
          leftBearing: (glyph.leftSideBearing ?? 0) * scale,
          topBearing: fontInfo.ascent - bbox.maxY,
          bbox
        };
      }
    }
    const data = glyphData[char];
    const hasInk = data.dPath !== "";
    if (graphicX === null) {
      graphicX = hasInk ? originX - data.bbox.minX : originX;
      if (hasInk) graphicY = originY + data.bbox.maxY;
    }
    if (hasInk) {
      const x = graphicX + data.bbox.minX;
      const y = graphicY - data.bbox.maxY;
      const width = data.bbox.maxX - data.bbox.minX;
      const height = data.bbox.maxY - data.bbox.minY;
      charJSONs.push({
        id: generateUuid(),
        type: "PATH",
        x,
        y,
        width,
        height,
        offsetX: x,
        offsetY: y,
        graphicX,
        graphicY,
        dPath: data.dPath,
        fillRule: "nonzero",
        isFill: true
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
    height: Number.isFinite(maxY - minY) ? maxY - minY : 0
  };
}

// src/xcs.ts
var TOKEN_RE = /\{\{([^}]+)\}\}/g;
function assertXcsFormat(buffer) {
  let project;
  try {
    project = JSON.parse(new TextDecoder().decode(buffer));
  } catch (err) {
    throw new Error(`Not a valid .xcs file: ${err.message}`);
  }
  if (typeof project !== "object" || project === null || !Array.isArray(project.canvas)) {
    throw new Error("Not a valid .xcs file: missing canvas array.");
  }
}
function readXcsFile(buffer) {
  return new TextDecoder().decode(buffer);
}
function extractXcsTokens(buffer) {
  const project = JSON.parse(readXcsFile(buffer));
  const seen = /* @__PURE__ */ new Set();
  for (const canvas of project.canvas) {
    for (const display of canvas.displays) {
      if (display.type === "TEXT" && typeof display.text === "string") {
        for (const match of display.text.matchAll(TOKEN_RE)) {
          seen.add(match[1]);
        }
      }
    }
  }
  return Array.from(seen);
}
function resolveFont(fontFamily, fonts, cache) {
  const key = fontFamily ?? "";
  const cached = cache.get(key);
  if (cached) return cached;
  const suppliedBuffer = fontFamily ? fonts?.[fontFamily] : void 0;
  const font = suppliedBuffer ? loadFont(suppliedBuffer) : loadDefaultFont();
  cache.set(key, font);
  return font;
}
function renderXcsFile(buffer, variables, values, fonts) {
  const project = JSON.parse(readXcsFile(buffer));
  const fontCache = /* @__PURE__ */ new Map();
  for (const canvas of project.canvas) {
    for (const display of canvas.displays) {
      if (display.type === "TEXT" && typeof display.text === "string") {
        const originalText = display.text;
        let text = originalText;
        for (const variable of variables) {
          const replacement = values[variable.token] ?? variable.defaultValue ?? "";
          text = text.replaceAll(`{{${variable.token}}}`, replacement);
        }
        display.text = text;
        if (text === originalText) continue;
        const style = display.style;
        const font = resolveFont(style?.fontFamily, fonts, fontCache);
        const originX = typeof display.x === "number" ? display.x : 0;
        const originY = typeof display.y === "number" ? display.y : 0;
        const layout = layoutText(font, text, originX, originY);
        display.fontData = layout.fontData;
        display.charJSONs = layout.charJSONs;
        if (layout.x !== null && layout.y !== null) {
          display.x = layout.x;
          display.y = layout.y;
          display.offsetX = layout.x;
          display.offsetY = layout.y;
          display.width = layout.width;
          display.height = layout.height;
        }
      }
    }
  }
  return new TextEncoder().encode(JSON.stringify(project));
}

// src/layout.ts
var LAYOUT_MM_PER_EM = 25.4;
function fontSizePoints(emSizeMm) {
  return emSizeMm / LAYOUT_MM_PER_EM * 72;
}
function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
function scaleDPath(dPath, factor) {
  return dPath.replace(/-?\d+(?:\.\d+)?/g, (value) => formatNumber(Number(value) * factor));
}
function rotateDPath(dPath, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const rotated = dPath.replace(
    /([MLQCZ])([^MLQCZ]*)/g,
    (_match, cmd, argsStr) => {
      if (cmd === "Z") return "Z";
      const nums = argsStr.trim().split(/\s+/).filter((part) => part.length > 0).map(Number);
      const out = [];
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
      return cmd + out.map(formatNumber).join(" ");
    }
  );
  if (!Number.isFinite(minX)) {
    return { dPath: rotated, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { dPath: rotated, minX, minY, maxX, maxY };
}
function layoutGlyphText(font, text, emSizeMm, xMm, yMm, letterSpacingMm = 0) {
  const layout = layoutText(font, text, 0, 0);
  if (layout.charJSONs.length === 0) return null;
  const factor = emSizeMm / LAYOUT_MM_PER_EM;
  const spacingShifts = [];
  if (letterSpacingMm > 0) {
    let position = 0;
    for (const char of text) {
      const glyph = layout.fontData.glyphData[char];
      if (glyph && glyph.dPath !== "") {
        spacingShifts.push(position * letterSpacingMm);
      }
      position += 1;
    }
  }
  const spacingFor = (index) => spacingShifts[index] ?? 0;
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
    dPath: scaleDPath(char.dPath, factor)
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
    graphicY: char.graphicY + shiftY
  }));
  const info = layout.fontData.fontInfo;
  const fontData = {
    fontInfo: {
      ...info,
      lineHeight: info.lineHeight * factor,
      ascent: info.ascent * factor,
      descent: info.descent * factor,
      capHeight: info.capHeight * factor,
      xHeight: info.xHeight * factor
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
            maxY: glyph.bbox.maxY * factor
          }
        }
      ])
    )
  };
  return {
    fontData,
    charJSONs,
    x: xMm,
    y: yMm,
    width: inkMaxX - inkMinX,
    height: inkMaxY - inkMinY
  };
}
function layoutMultilineGlyphText(font, text, emSizeMm, letterSpacingMm, lineHeightMult, align) {
  const lines = text.split("\n");
  if (lines.length === 1) {
    return layoutGlyphText(font, text, emSizeMm, 0, 0, letterSpacingMm);
  }
  const slot = emSizeMm * lineHeightMult;
  const layouts = lines.map((line) => layoutGlyphText(font, line, emSizeMm, 0, 0, letterSpacingMm));
  const blockWidth = Math.max(0, ...layouts.map((layout) => layout?.width ?? 0));
  const charJSONs = [];
  const glyphData = {};
  let fontInfo = null;
  layouts.forEach((layout, index) => {
    if (!layout) return;
    const insetX = align === "center" ? (blockWidth - layout.width) / 2 : align === "right" ? blockWidth - layout.width : 0;
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
    height: slot * lines.length
  };
}
function translateGlyphLayout(layout, dxMm, dyMm) {
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
      graphicY: char.graphicY + dyMm
    }))
  };
}
var MIN_CURVE_DEG = 1;
var MAX_CURVE_DEG = 355;
function effectiveCurveDeg(curveDeg) {
  if (curveDeg === void 0 || Math.abs(curveDeg) < MIN_CURVE_DEG) return 0;
  return Math.max(-MAX_CURVE_DEG, Math.min(MAX_CURVE_DEG, curveDeg));
}
function arcGeometryFor(widthMm, heightMm, curveDeg) {
  const deg = effectiveCurveDeg(curveDeg);
  if (deg === 0 || widthMm <= 0) return null;
  const theta = Math.abs(deg) * Math.PI / 180;
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
    angleStep: (up ? 1 : -1) / radius
  };
}
function pointOnArc(arc, s) {
  const angle = arc.startAngle + arc.angleStep * s;
  const direction = Math.sign(arc.angleStep) || 1;
  return {
    x: arc.centerX + arc.radius * Math.cos(angle),
    y: arc.centerY + arc.radius * Math.sin(angle),
    angleRad: Math.atan2(Math.cos(angle) * direction, -Math.sin(angle) * direction)
  };
}
function layoutCurvedGlyphText(font, text, emSizeMm, curveDeg, boxWidthMm, boxHeightMm, align = "left", letterSpacingMm = 0) {
  const straight = layoutGlyphText(font, text, emSizeMm, 0, 0, letterSpacingMm);
  if (!straight) return null;
  const arc = arcGeometryFor(boxWidthMm, boxHeightMm, curveDeg);
  if (!arc) return straight;
  const startOffset = align === "center" ? (arc.arcLength - straight.width) / 2 : align === "right" ? arc.arcLength - straight.width : 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const charJSONs = straight.charJSONs.map((char) => {
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
      dPath: rotated.dPath
    };
  });
  return {
    fontData: straight.fontData,
    charJSONs,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// src/builder.ts
var XCSGenerator = class {
  canvasId;
  canvas;
  displays = [];
  layers = /* @__PURE__ */ new Map();
  options;
  constructor(options = {}) {
    this.options = {
      deviceId: options.deviceId || "P2S",
      devicePower: options.devicePower || 55,
      canvasWidth: options.canvasWidth || 400,
      canvasHeight: options.canvasHeight || 400
    };
    this.canvasId = this.generateUUID();
    this.canvas = this.createCanvas();
    this.addLayer("#00befe", "{Cyan}", 1);
  }
  /**
   * Add a text object to the canvas. Pass `layout` (built via
   * `layoutGlyphText`/`layoutMultilineGlyphText`/`layoutCurvedGlyphText`
   * from a real font) so xTool Studio renders actual glyph outlines;
   * without it the text carries placeholder glyph data that renders
   * as blocks.
   */
  addText(text, x, y, options = {}) {
    const textObj = this.createTextObject(text, x, y, options);
    this.displays.push(textObj);
    return this;
  }
  /**
   * Add a path object to the canvas
   */
  addPath(pathData, x, y, width, height, options = {}) {
    const pathObj = this.createPathObject(pathData, x, y, width, height, options);
    this.displays.push(pathObj);
    return this;
  }
  /**
   * Add an embedded PNG image, displayed at widthMm x heightMm with
   * its top-left at (x, y). Field set mirrors xTool Studio's own
   * BITMAP displays; the image travels inline as a data URL.
   */
  addBitmap(pngBase64, x, y, widthMm, heightMm, originWidthPx, originHeightPx, options = {}) {
    const layerColor = options.layerColor || "#00befe";
    const dataUrl = `data:image/png;base64,${pngBase64}`;
    const scaleX = originWidthPx > 0 ? widthMm / originWidthPx : 1;
    const scaleY = originHeightPx > 0 ? heightMm / originHeightPx : 1;
    const bitmap = {
      id: this.generateUUID(),
      name: null,
      type: "BITMAP",
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
      originColor: "#000000",
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: "",
      customData: {},
      rootComponentId: "",
      minCanvasVersion: "0.0.0",
      alpha: 1,
      fill: {
        paintType: "color",
        visible: false,
        color: 0,
        alpha: 1
      },
      stroke: {
        paintType: "color",
        visible: false,
        color: 0,
        alpha: 1,
        width: 1,
        cap: "butt",
        join: "miter",
        miterLimit: 4,
        alignment: 0.5
      },
      width: widthMm,
      height: heightMm,
      isFill: true,
      lineColor: 0,
      fillColor: "#000000",
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
        dpiY: scaleY > 0 ? 25.4 / scaleY : 96
      },
      isGray: false,
      opacity: 1
    };
    this.displays.push(bitmap);
    return this;
  }
  /**
   * Add a layer to the canvas
   */
  addLayer(color, name, order) {
    this.layers.set(color, {
      name,
      order,
      visible: true
    });
    return this;
  }
  /**
   * Generate the complete XCS file
   */
  generate() {
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
          dataType: "Map",
          value: []
        },
        materialList: [],
        materialTypeList: [],
        customProjectData: {}
      },
      version: "1.1.10",
      created: now,
      modify: now,
      ua: "unofficial-xcs-writer",
      meta: [],
      cover: this.generatePreviewImage(),
      minRequiredVersion: "2.6.0",
      appMinRequiredVersion: "",
      webMinRequiredVersion: "",
      projectTraceID: this.generateUUID()
    };
  }
  /**
   * Export as JSON string
   */
  toJSON() {
    return JSON.stringify(this.generate());
  }
  /**
   * Export as a UTF-8 byte array, matching `renderXcsFile`'s output type.
   */
  toBytes() {
    return new TextEncoder().encode(this.toJSON());
  }
  createCanvas() {
    return {
      id: this.canvasId,
      title: "{panel}1",
      layerData: {},
      groupData: {},
      displays: [],
      extendInfo: {
        version: "2.15.17",
        minCanvasVersion: "0.0.0",
        displayProcessConfigMap: {},
        rulerPluginData: {
          rulerGuide: []
        },
        gridOptions: {
          color: "normal",
          isShow: true
        }
      }
    };
  }
  createTextObject(text, x, y, options) {
    const fontSize = options.fontSize || 72;
    const fontFamily = options.fontFamily || "Lato";
    const layerColor = options.layerColor || "#00befe";
    const fillColor = options.fillColor || "#f9932b";
    const lineColor = options.lineColor || 16426268;
    const layout = options.layout;
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
      type: "TEXT",
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
      originColor: "#000000",
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: "",
      customData: {},
      rootComponentId: "",
      minCanvasVersion: "0.0.0",
      fill: {
        paintType: "color",
        visible: false,
        color: 0,
        alpha: 1
      },
      stroke: {
        paintType: "color",
        visible: true,
        color: 0,
        alpha: 1,
        width: 1,
        cap: "butt",
        join: "miter",
        miterLimit: 4,
        alignment: 0.5
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
        fontSubfamily: "Regular",
        fontSource: "system",
        letterSpacing: options.letterSpacing || 0,
        leading: 0,
        align: options.align || "center",
        curveX: 56,
        curveY: 0,
        isUppercase: false,
        isWeld: false,
        direction: "auto",
        writingMode: "horizontal-tb",
        textOrientation: "mixed"
      },
      fontData,
      charJSONs: layout ? layout.charJSONs : [],
      fillRule: "nonzero"
    };
  }
  createPathObject(pathData, x, y, width, height, options) {
    const layerColor = options.layerColor || "#00befe";
    const fillColor = options.fillColor || "#f9932b";
    const lineColor = options.lineColor || 16426268;
    const isFill = options.isFill !== void 0 ? options.isFill : true;
    return {
      id: this.generateUUID(),
      name: null,
      type: "PATH",
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
      originColor: "#000000",
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: "",
      customData: {},
      rootComponentId: "",
      minCanvasVersion: "0.0.0",
      fill: {
        paintType: "color",
        visible: false,
        color: 0,
        alpha: 1
      },
      stroke: {
        paintType: "color",
        visible: true,
        color: 0,
        alpha: 1,
        width: 1,
        cap: "butt",
        join: "miter",
        miterLimit: 4,
        alignment: 0.5
      },
      width,
      height,
      isFill,
      lineColor,
      fillColor,
      points: [],
      dPath: pathData,
      fillRule: "nonzero",
      graphicX: x,
      graphicY: y,
      isCompoundPath: false
    };
  }
  createSimpleFontData(text) {
    const glyphData = {};
    const uniqueChars = [...new Set(text.split(""))];
    uniqueChars.forEach((char) => {
      glyphData[char] = {
        dPath: "M0 0L10 0L10 10L0 10Z",
        advanceWidth: 15,
        advanceHeight: 25.4,
        leftBearing: 0.5,
        topBearing: 2.2,
        bbox: {
          minX: 0,
          minY: 0,
          maxX: 15,
          maxY: 18.2
        }
      };
    });
    return {
      fontInfo: {
        unitsPerEm: 2e3,
        lineHeight: 30.48,
        ascent: 25.0698,
        descent: -5.4102,
        capHeight: 18.1991,
        xHeight: 12.8651,
        lineGap: 0
      },
      glyphData
    };
  }
  generatePreviewImage() {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
  generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
};
function createXCS(deviceId = "P2S") {
  return new XCSGenerator({ deviceId });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  XCSGenerator,
  assertXcsFormat,
  createXCS,
  effectiveCurveDeg,
  extractXcsTokens,
  fontSizePoints,
  layoutCurvedGlyphText,
  layoutGlyphText,
  layoutMultilineGlyphText,
  layoutText,
  loadDefaultFont,
  loadFont,
  readXcsFile,
  renderXcsFile,
  translateGlyphLayout
});
//# sourceMappingURL=index.cjs.map
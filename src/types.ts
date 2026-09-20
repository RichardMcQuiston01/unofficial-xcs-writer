export interface XcsVariable {
  token: string;
  defaultValue?: string;
}

export interface XcsDisplay {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface XcsCanvas {
  displays: XcsDisplay[];
  [key: string]: unknown;
}

export interface XcsProject {
  canvasId: string;
  canvas: XcsCanvas[];
  [key: string]: unknown;
}

/**
 * A parsed `canvases/<canvasId>/displays-<chunkIndex>.json` entry from
 * an `.xs` (v2 workspace) archive -- see src/xs.ts.
 */
export interface XsDisplaysChunk {
  canvasId: string;
  chunkIndex: number;
  displays: XcsDisplay[];
  [key: string]: unknown;
}

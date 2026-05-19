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

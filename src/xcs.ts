import type { XcsProject, XcsVariable } from './types.js';

const TOKEN_RE = /\{\{([^}]+)\}\}/g;

export function assertXcsFormat(buffer: ArrayBuffer): void {
  let project: unknown;
  try {
    project = JSON.parse(new TextDecoder().decode(buffer));
  } catch (err) {
    throw new Error(`Not a valid .xcs file: ${(err as Error).message}`);
  }
  if (
    typeof project !== 'object' ||
    project === null ||
    !Array.isArray((project as Record<string, unknown>).canvas)
  ) {
    throw new Error('Not a valid .xcs file: missing canvas array.');
  }
}

export function readXcsFile(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

export function extractXcsTokens(buffer: ArrayBuffer): string[] {
  const project = JSON.parse(readXcsFile(buffer)) as XcsProject;
  const seen = new Set<string>();

  for (const canvas of project.canvas) {
    for (const display of canvas.displays) {
      if (display.type === 'TEXT' && typeof display.text === 'string') {
        for (const match of display.text.matchAll(TOKEN_RE)) {
          seen.add(match[1]);
        }
      }
    }
  }

  return Array.from(seen);
}

export function renderXcsFile(
  buffer: ArrayBuffer,
  variables: XcsVariable[],
  values: Record<string, string>,
): Uint8Array {
  const project = JSON.parse(readXcsFile(buffer)) as XcsProject;

  for (const canvas of project.canvas) {
    for (const display of canvas.displays) {
      if (display.type === 'TEXT' && typeof display.text === 'string') {
        let text = display.text;
        for (const variable of variables) {
          const replacement = values[variable.token] ?? variable.defaultValue ?? '';
          text = text.replaceAll(`{{${variable.token}}}`, replacement);
        }
        display.text = text;
      }
    }
  }

  return new TextEncoder().encode(JSON.stringify(project));
}

/**
 * A catalog of real xTool machine identities, used by `XCSGenerator` to
 * embed accurate device metadata instead of a generic placeholder --
 * particularly relevant for `.toXsBytes()` output, where
 * `devices/device-<id>.json`'s `deviceCode` has no `.xcs` equivalent
 * to fall back on (see `src/xs.ts`'s doc comment).
 *
 * Each entry is reverse-engineered from a real export in this repo's
 * `xcs_samples/`/`xs_samples/` -- never guessed. `deviceCode` is
 * `.xs`-only and stays unset for a machine this repo has no `.xs`
 * sample from, even if its `.xcs` identity is known.
 *
 * `device.id` itself (not stored here -- `XCSGenerator` always uses
 * `extId`) follows a `<deviceCode>-<n>` pattern in real exports (e.g.
 * `ZY013-1`, `GS009-CLASS-4-1`) -- `n` looks like a per-unit/session
 * instance number, not a fixed part of the model identity, so it's
 * deliberately not reproduced here.
 *
 * A few real machines report `power` as more than one value (e.g. a
 * dual-module laser's per-module power). `defaultPower` only holds a
 * single number, matching `XCSGeneratorOptions.devicePower`, so these
 * use the first value -- the fuller array isn't representable via the
 * current single-power API.
 */

export interface MachineProfile {
  /** Human-readable model name -- also this catalog's key. */
  name: string;
  /** `.xcs`'s root `extId`/`extName` and both formats' `device.id`. */
  extId: string;
  extName: string;
  /** `.xs`'s `devices/device-<id>.json`'s `deviceCode`, e.g. `"ZY013"` for a P2S. Omitted when unverified. */
  deviceCode?: string;
  /** Default `device.power`, overridable via `XCSGeneratorOptions.devicePower`. */
  defaultPower: number;
}

/**
 * Known machines, keyed by `name`. Verified from real exports:
 * - `P2S`: `xs_samples/EditableText.xs` etc. (`devices/device-ZY013-1.json`).
 * - `F2 Ultra UV`: `xcs_samples/*.xcs` (root `extId`/`extName`) and
 *   `xs_samples/EditableText_F2UltraUV.xs` (`deviceCode`).
 * - `S1`, `P3`, `M2`, `F2`, `F2 Ultra (Single)`, `F2 Ultra`, `M1 Ultra`,
 *   `F1`, `F1 Lite`, `F1 Ultra`, `MetalFab`: `xs_samples/EditableText_<Machine>.xs`.
 */
export const XTOOL_MACHINES: Record<string, MachineProfile> = {
  P2S: {
    name: 'P2S',
    extId: 'P2S',
    extName: 'P2S',
    deviceCode: 'ZY013',
    defaultPower: 55,
  },
  'F2 Ultra UV': {
    name: 'F2 Ultra UV',
    extId: 'GS009-CLASS-4',
    extName: 'F2 Ultra UV',
    deviceCode: 'GS009-CLASS-4',
    defaultPower: 5,
  },
  S1: {
    name: 'S1',
    extId: 'S1',
    extName: 'S1',
    deviceCode: 'MD2',
    defaultPower: 40,
  },
  P3: {
    name: 'P3',
    extId: 'P3',
    extName: 'P3',
    deviceCode: 'ZY015',
    defaultPower: 80,
  },
  M2: {
    name: 'M2',
    extId: 'JS002',
    extName: 'M2',
    deviceCode: 'JS002',
    defaultPower: 10,
  },
  F2: {
    name: 'F2',
    extId: 'GS006',
    extName: 'F2',
    deviceCode: 'GS006',
    defaultPower: 5,
  },
  'F2 Ultra (Single)': {
    name: 'F2 Ultra (Single)',
    extId: 'GS007-CLASS-4',
    extName: 'F2 Ultra (Single)',
    deviceCode: 'GS007-CLASS-4',
    defaultPower: 60,
  },
  'F2 Ultra': {
    name: 'F2 Ultra',
    extId: 'GS004-CLASS-4',
    extName: 'F2 Ultra',
    deviceCode: 'GS004-CLASS-4',
    defaultPower: 60,
  },
  'M1 Ultra': {
    name: 'M1 Ultra',
    extId: 'M1Ultra',
    extName: 'M1 Ultra',
    deviceCode: 'ZH009',
    defaultPower: 20,
  },
  F1: {
    name: 'F1',
    extId: 'F1',
    extName: 'F1',
    deviceCode: 'MF1',
    defaultPower: 10,
  },
  'F1 Lite': {
    name: 'F1 Lite',
    extId: 'GS005',
    extName: 'F1 Lite',
    deviceCode: 'GS005',
    defaultPower: 10,
  },
  'F1 Ultra': {
    name: 'F1 Ultra',
    extId: 'F1Ultra',
    extName: 'F1 Ultra',
    deviceCode: 'GS002',
    defaultPower: 20,
  },
  MetalFab: {
    name: 'MetalFab',
    extId: 'HJ003',
    extName: 'MetalFab CNC Cutter',
    deviceCode: 'HJ003',
    defaultPower: 1200,
  },
};

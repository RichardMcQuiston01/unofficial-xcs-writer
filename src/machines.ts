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
 * - `P2S`: `xs_samples/*.xs` (`devices/device-ZY013-1.json`).
 * - `F2 Ultra UV`: `xcs_samples/*.xcs` (root `extId`/`extName`); no
 *   `.xs` sample exists for it yet, so `deviceCode` is unset.
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
    defaultPower: 5,
  },
};

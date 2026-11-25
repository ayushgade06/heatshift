// Australian Bureau of Meteorology WBGT approximation (see NOTES.md for the verification record).
// Valid for moderately sunny, light-wind conditions; ignores measured radiation and wind.

/** Water vapour pressure in hPa from air temperature (°C) and relative humidity (%). */
export function vaporPressureHpa(tC: number, rh: number): number {
  return (rh / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
}

/** Estimated WBGT (°C). */
export function wbgtBoM(tC: number, rh: number): number {
  return 0.567 * tC + 0.393 * vaporPressureHpa(tC, rh) + 3.94;
}

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

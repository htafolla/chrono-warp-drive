/**
 * TLM constants — mcp mirror of src/lib/tlmConstants.ts.
 *
 * Canonical definitions: htafolla/trinitarium src/data/codexData.ts
 * (TLM key_variables / symbols, @5c0294d)
 * L = 3 at line 736
 * phi = 1.666 at line 748
 * F_h = [5, 3] at lines 1226–1231
 * C_TLM = infinity at lines 1234–1237
 * C_h = "3 × 10^12 m/s" at lines 1239–1241
 */
export const L = 3;
export const PHI = 5 / 3;
export const F_h = [5, 3] as const;
export const C_TLM = Number.POSITIVE_INFINITY;
export const C_h = 3e12;

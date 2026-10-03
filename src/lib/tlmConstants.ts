/**
 * TLM constants — chrono module.
 *
 * Canonical definitions: htafolla/trinitarium src/data/codexData.ts
 * (TLM key_variables / symbols, @5c0294d)
 * L = 3 at line 736 (key_variables: "\( L = 3 \)", Yeshua's Light, Trinitarian unity)
 * phi = 1.666 at line 748 ("Tabernacle ratio (5/3, Ex 25:23-30; updated from 1.618 per TLM")
 * F_h = [5, 3] at lines 1226–1231 ("Finite Frequency, adjusted in TLM to 5 and 3")
 * C_TLM = ∞ at lines 1234–1237
 * C_h = "3 × 10^12 m/s" at lines 1239–1241 ("Speed of Light in human terms")
 *
 * Do not hardcode 1.666 literals elsewhere;
 * import L, PHI, F_h, C_TLM, C_h from this module.
 */

/** Trinity (Father, Son, Holy Spirit) */
export const L = 3;

/** Temple measure, divine balance (5/3 ≈ 1.666) */
export const PHI = 5 / 3;

/** Finite Frequency, the TLM pair 5 and 3 (codexData lines 1226–1231). */
export const F_h = [5, 3] as const;

/** TLM context. Canonical value is infinity (codexData lines 1234–1237). */
export const C_TLM = Number.POSITIVE_INFINITY;

/** Human-scaled light speed (3×10¹² m/s) */
export const C_h = 3e12;
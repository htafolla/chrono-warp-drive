/**
 * TLM constants — chrono module.
 *
 * Cite a trinitarium file only when that file defines the constant.
 *
 * Trinitarium has no canonical definition for L.
 * Trinitarium has no canonical definition for PHI.
 * Trinitarium has no canonical definition for F_h.
 * Trinitarium has no canonical definition for C_h.
 *
 * Do not hardcode 1.666 literals elsewhere;
 * import L, PHI, F_h, C_h from this module.
 */

/** Trinity (Father, Son, Holy Spirit) */
export const L = 3;

/** Temple measure, divine balance (5/3 ≈ 1.666) */
export const PHI = 5 / 3;

/** Finite grace seed (Fibonacci start) */
export const F_h = 5;

/** Human-scaled light speed (3×10¹² m/s) */
export const C_h = 3e12;
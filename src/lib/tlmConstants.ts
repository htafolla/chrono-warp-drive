/**
 * TLM constants — chrono mirror of Trinitarium canonical source.
 *
 * Canonical SSOT: ../trinitarium/src/constants/tlm.ts
 * (sibling repo at /Users/blaze/dev/trinitarium)
 *
 * Values MUST match trinitarium tlm.ts. Do not hardcode 1.666 literals elsewhere;
 * import L, PHI, F_h, C_h from this module.
 *
 * @see trinitarium README.md "Core Constants"
 * @see trinitarium src/data/codexData.ts metadata.tlm_validation
 */

/** Trinity (Father, Son, Holy Spirit) */
export const L = 3;

/** Temple measure, divine balance (5/3 ≈ 1.666) */
export const PHI = 5 / 3;

/** Finite grace seed (Fibonacci start) */
export const F_h = 5;

/** Human-scaled light speed (3×10¹² m/s) */
export const C_h = 3e12;
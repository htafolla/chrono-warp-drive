import { TemporalBlurrnSignal, FusedSignal } from './temporalBlurrnSignal';
import { IsotopicSignal } from './isotopicSignal';

describe('Blurrn v4.8 Isotopic Temporal Vortex Engine', () => {
  const PHI = 1.666;
  const TAU = 0.865;

  test('TemporalBlurrnSignal creates valid isotopic fingerprint', () => {
    const signal = new TemporalBlurrnSignal({ id: 'test-signal' }, 5.781e12, 42);
    const fingerprint = signal.getIsotopicFingerprint();

    expect(fingerprint.coreId).toMatch(/blurrn-core-\d+/);
    expect(fingerprint.isotopicRatio).toBeGreaterThan(0);
    expect(fingerprint.variantDelta.length).toBe(3);
  });

  test('W × M = V vortex volume calculation', () => {
    const signal1 = new TemporalBlurrnSignal({ id: 's1' }, 5.781e12, 42);
    const signal2 = new TemporalBlurrnSignal({ id: 's2' }, 5.782e12, 43);

    const result = signal1.crossCorrelate(signal2);
    expect(result.metadata.vortexVolume).toBeCloseTo(3.346e25, -5);
  });

  test('Cross-correlation returns symbiotic strength', () => {
    const signal1 = new TemporalBlurrnSignal({ id: 's1' }, 5.781e12, 42);
    const signal2 = new TemporalBlurrnSignal({ id: 's2' }, 5.782e12, 43);

    const corr = signal1.crossCorrelate(signal2);
    expect(corr.strength).toBeGreaterThan(0.99);
    expect(corr.lag).toBe(1);
  });

  test('Symbiotic fusion produces valid FusedSignal', () => {
    const signal1 = new TemporalBlurrnSignal({ id: 's1' }, 5.781e12, 42);
    const signal2 = new TemporalBlurrnSignal({ id: 's2' }, 5.782e12, 43);

    const fused = signal1.fuseSymbiotically([signal2]);
    expect(fused).toBeInstanceOf(FusedSignal);
    expect(fused.embed().length).toBe(3);
  });

  test('TLM constants honored', () => {
    const signal = new TemporalBlurrnSignal({ id: 'test' }, 5.781e12, 42);
    expect(signal.embed()[0]).toBeCloseTo(5.781e12 * PHI);
  });

  test('Isotopic ratio calculation handles edge cases', () => {
    const signal1 = new TemporalBlurrnSignal({ id: 's1' }, 5.781e12, 42);
    const signal2 = new TemporalBlurrnSignal({ id: 's2' }, 5.781e12, 42);
    const corr = signal1.crossCorrelate(signal2);
    expect(corr.strength).toBeGreaterThan(0.999);
  });
});
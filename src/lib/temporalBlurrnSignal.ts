// src/lib/temporalBlurrnSignal.ts
import { IsotopicSignal, CorrelationResult, TriangulationResult, FusedSignal } from './isotopicSignal';
import { PHI } from './tlmConstants';

export { FusedSignal };
const TAU = 0.865;

export class TemporalBlurrnSignal extends IsotopicSignal {
  public readonly tdfValue: number;
  public readonly cascadeIndex: number;
  public readonly phaseCoherence: number;
  private rawSignal: any;

  constructor(rawSignal: any, tdfValue: number, cascadeIndex: number) {
    super();
    this.rawSignal = rawSignal;
    this.tdfValue = tdfValue;
    this.cascadeIndex = cascadeIndex;
    const reducedTdf = tdfValue % Math.sqrt(PHI);
    this.phaseCoherence = Math.pow(Math.sin(2 * Math.PI * TAU * reducedTdf), 2);
  }

  getTdfValue(): number { return this.tdfValue }
  getCascadeIndex(): number { return this.cascadeIndex }
  getPhaseCoherence(): number { return this.phaseCoherence }

  embed(): number[] {
    return [this.tdfValue * PHI, this.cascadeIndex, this.phaseCoherence];
  }

  getIsotopeId(): string {
    return `blurrn-core-${Math.floor(this.tdfValue / 1e6)}`;
  }

  getVariantDelta(): number[] {
    return [this.tdfValue % 1e6, this.cascadeIndex * TAU, 1 - this.phaseCoherence];
  }

  getIsotopicFingerprint() {
    return {
      coreId: this.getIsotopeId(),
      variantDelta: this.getVariantDelta(),
      isotopicRatio: this.phaseCoherence,
      provenance: [`TDF:${this.tdfValue}`, `cascade:${this.cascadeIndex}`]
    };
  }

  crossCorrelate(other: IsotopicSignal): CorrelationResult {
    if (!(other instanceof TemporalBlurrnSignal)) {
      return { strength: 0.3, lag: 0, metadata: {} };
    }
    const phaseAlign = 1 - Math.abs(this.phaseCoherence - (other as TemporalBlurrnSignal).phaseCoherence);
    const strength = this.calculateIsotopicRatio(other) * phaseAlign;
    const lag = Math.abs(this.cascadeIndex - (other as any).cascadeIndex);
    const vortexVolume = this.tdfValue * (other as any).tdfValue; // W × M = V
    return {
      strength,
      lag,
      metadata: { vortexVolume }
    };
  }

  triangulate(others: IsotopicSignal[]): TriangulationResult {
    return { anchors: [this.embed()], confidence: this.phaseCoherence };
  }

  fuseSymbiotically(partners: IsotopicSignal[]): FusedSignal {
    const allEmbeds = [this.embed(), ...partners.map(p => p.embed())];
    const fusedData = allEmbeds.reduce((acc, val) => acc.map((v, i) => v + val[i]), Array(allEmbeds[0].length).fill(0))
      .map(v => v / allEmbeds.length);
    return new FusedSignal(fusedData);
  }
}
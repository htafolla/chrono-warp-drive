/**
 * The registry and token ABIs are JSON imports. viem infers a call only when
 * the ABI is a const generic. A wide array type collapses that overload into
 * a parameter list the JSON import cannot satisfy. These wrappers keep the
 * runtime call and return unknown so the caller checks the shape.
 */

export interface ContractCall {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  nonce?: bigint | number;
}

type LooseRead = (args: never) => Promise<unknown>;
type LooseWrite = (args: never) => Promise<`0x${string}`>;

export function readContractView(client: object, args: ContractCall): Promise<unknown> {
  const read = (client as unknown as { readContract: LooseRead }).readContract;
  return read(args as never);
}

export function writeContractTx(client: object, args: ContractCall): Promise<`0x${string}`> {
  const write = (client as unknown as { writeContract: LooseWrite }).writeContract;
  return write(args as never);
}

export function asBigint(value: unknown): bigint {
  if (typeof value !== 'bigint') {
    throw new Error('contract view did not return a bigint');
  }
  return value;
}

export function asAddress(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('0x')) {
    throw new Error('contract view did not return an address');
  }
  return value;
}

export function containerIdOf(value: unknown): string {
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    if (typeof row.containerId === 'string') return row.containerId;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  throw new Error('getContainerData did not return a container id');
}

export function asContainerPage(value: unknown): readonly [readonly string[], bigint] {
  if (!Array.isArray(value) || value.length < 2 || !Array.isArray(value[0]) || typeof value[1] !== 'bigint') {
    throw new Error('listContainers did not return ids and a total');
  }
  const ids = value[0].filter((id): id is string => typeof id === 'string');
  return [ids, value[1]];
}

export interface OnChainContainer {
  timestamp: bigint;
  source: string;
  resonanceProfile: {
    verdict: string;
    fullBox7DComposite: bigint;
  };
  moralOverlay: {
    trinitariumMoralScore: bigint;
    moralNumerologicalTension: string;
  };
}

export function asOnChainContainer(value: unknown): OnChainContainer {
  if (!value || typeof value !== 'object') {
    throw new Error('getContainer did not return a container');
  }
  const row = value as Record<string, unknown>;
  const resonance = row.resonanceProfile;
  const moral = row.moralOverlay;
  if (!resonance || typeof resonance !== 'object' || !moral || typeof moral !== 'object') {
    throw new Error('getContainer is missing resonance or moral fields');
  }
  const profile = resonance as Record<string, unknown>;
  const overlay = moral as Record<string, unknown>;
  if (typeof row.timestamp !== 'bigint' || typeof row.source !== 'string') {
    throw new Error('getContainer is missing timestamp or source');
  }
  if (typeof profile.verdict !== 'string' || typeof profile.fullBox7DComposite !== 'bigint') {
    throw new Error('getContainer resonance profile is incomplete');
  }
  if (typeof overlay.trinitariumMoralScore !== 'bigint' || typeof overlay.moralNumerologicalTension !== 'string') {
    throw new Error('getContainer moral overlay is incomplete');
  }
  return {
    timestamp: row.timestamp,
    source: row.source,
    resonanceProfile: {
      verdict: profile.verdict,
      fullBox7DComposite: profile.fullBox7DComposite,
    },
    moralOverlay: {
      trinitariumMoralScore: overlay.trinitariumMoralScore,
      moralNumerologicalTension: overlay.moralNumerologicalTension,
    },
  };
}

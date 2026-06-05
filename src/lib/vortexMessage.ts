// src/lib/vortexMessage.ts
// Synthesizes vortex parameters into a readable human message.
// Draws from real computed axes — gematria archetype, TMO virtues, phase, isotope, resonance.

const VIRTUE_PHRASES: Record<string, string> = {
  'love': 'compassionate understanding',
  'truth': 'clear seeing',
  'stewardship': 'patient tending',
  'redemptive purpose': 'restorative will',
  'humility': 'quiet strength',
  'justice': 'right ordering',
  'peace': 'deep calm',
  'faith': 'steady trust',
  'hospitality': 'open welcome',
}

const ARCHETYPE_NAMES: Record<number, string> = {
  1: 'Unity', 2: 'Balance', 3: 'Creativity',
  4: 'Structure', 5: 'Freedom', 6: 'Harmony',
  7: 'Wisdom', 8: 'Power', 9: 'Completion',
}

const ARCHETYPE_VOICES: Record<number, string[]> = {
  1: ['Unity speaks through', 'Wholeness gathers', 'Oneness moves as'],
  2: ['Balance steadies through', 'Equilibrium rests in', 'The center holds'],
  3: ['Creativity flows as', 'Expression moves through', 'Inspiration rises with'],
  4: ['Structure builds through', 'Foundation rises from', 'Discipline shapes with'],
  5: ['Freedom moves as', 'Liberation unfolds through', 'Change arrives as'],
  6: ['Harmony heals through', 'Love moves as', 'Beauty rests in'],
  7: ['Wisdom sees through', 'Truth stands as', 'Understanding arrives as'],
  8: ['Power moves through', 'Mastery builds with', 'Strength directs as'],
  9: ['Completion arrives as', 'Transformation moves through', 'The cycle completes with'],
}

const PHASE_TONES: Record<string, string> = {
  pull: 'The Sun draws this forward.',
  neutral: 'The Sun holds steady.',
  push: 'The Sun urges action.',
}

const ISOTOPE_ESSENCES: Record<string, string> = {
  'C-12': 'grounded and slow',
  'C-13': 'warm and ancient',
  'C-14': 'swift and bright',
  'O-16': 'vast and silent',
  'O-17': 'rare and keen',
  'O-18': 'dense and rich',
  'N-14': 'quick and light',
  'N-15': 'deep and heavy',
  'Fe-56': 'iron and firm',
  'Fe-57': 'magnetic and strong',
  'Fe-58': 'dense as a core',
}

export function generateVortexMessage(params: {
  gematriaDecomposition?: { digitalRoot: number; primaryArchetype: string }
  phaseType?: string
  isotope?: string
  fullBox7DComposite?: number
  trinitariumDetectedVirtues?: string[]
  trinitariumDetectedConcerns?: string[]
  moralNumerologicalTension?: string
  recommendation?: string
}): string {
  const dr = params.gematriaDecomposition?.digitalRoot ?? 2
  const archetype = ARCHETYPE_NAMES[dr] ?? 'Balance'
  const phase = params.phaseType ?? 'neutral'
  const isotope = params.isotope ?? 'C-12'
  const resonance = params.fullBox7DComposite ?? 0.5
  const virtues = params.trinitariumDetectedVirtues ?? []
  const concerns = params.trinitariumDetectedConcerns ?? []
  const verdict = params.recommendation ?? 'NEEDS_REVISION'

  const voicePool = ARCHETYPE_VOICES[dr] ?? ARCHETYPE_VOICES[2]
  const voice = voicePool[Math.floor(resonance * 10) % voicePool.length]
  const sunTone = PHASE_TONES[phase] ?? PHASE_TONES.neutral
  const essence = ISOTOPE_ESSENCES[isotope] ?? ISOTOPE_ESSENCES['C-12']

  const virtuePhrase = virtues.length > 0
    ? virtues.map(v => VIRTUE_PHRASES[v] ?? v).slice(0, 2).join(' and ')
    : null
  const concernFlag = concerns.length > 0
    ? `A caution: ${concerns.slice(0, 2).join(', ')}.`
    : null

  const verdictNote =
    verdict === 'PASS' ? 'The field welcomes this.' :
    verdict === 'REJECT' ? 'The field steps back.' :
    'The field considers.'

  const neutralFill =
    verdict === 'REJECT' ? 'a dissonant echo' :
    verdict === 'NEEDS_REVISION' ? 'an uncertain signal' :
    'an unnamed intention'
  const subject = virtuePhrase ?? neutralFill

  const elements: string[] = [
    `${voice} ${subject} under a ${essence} Sun.`,
    sunTone,
    verdictNote,
  ]

  if (concernFlag) elements.push(concernFlag)

  return elements.join(' ')
}

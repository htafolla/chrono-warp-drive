// mcp/lib/trinitariumMoralOverlay.ts
// Trinitarium Moral Overlay — enriched ~180 pattern moral alignment scoring
// based on Trinitarium's love-centered, scripturally-grounded framework.
//
// SEPARATE AXIS — NOT mixed into the 7D resonance formula.
// Core engine remains amoral, solar-grounded, pure measurement.
// This is a downstream interpretive layer the consumer can use to filter.

export interface TrinitariumOverlayInput {
  proposalText: string
  intent?: string
  riskLevel?: 'low' | 'medium' | 'high'
  tags?: string[]
  gematriaResonance?: number
  gematriaEnglishOrdinal?: number
  gematriaFullReduction?: number
}

export interface TrinitariumMoralScore {
  trinitariumMoralScore: number
  virtueAlignment: number
  harmPotential: number
  intentAlignment: number
  sacredTextAffinity: number
  details: {
    detectedVirtues: string[]
    detectedConcerns: string[]
  }
}

const VIRTUE_PATTERNS: { virtue: string; patterns: RegExp[] }[] = [
  {
    virtue: 'love',
    patterns: [
      /love/i, /compassion/i, /kindness/i, /mercy/i, /charity/i,
      /care\s+for/i, /nurture/i, /heal/i, /tend/i, /caring/i,
      /love\s+your\s+neighbor/i, /love\s+one\s+another/i, /show\s+mercy/i,
      /care\s+for\s+the\s+(vulnerable|poor|weak|elderly|orphan|widow)/i,
      /forgive/i, /forgiveness/i, /lovingkindness/i, /tender/i,
      /heart\s+of\s+(compassion|love|mercy)/i, /brotherly\s+love/i,
      /agape/i, /unconditional\s+love/i, /sacrificial\s+love/i,
      /beloved/i, /dear\s+one/i, /cherish/i, /embrace/i,
    ],
  },
  {
    virtue: 'truth',
    patterns: [
      /truth/i, /honest/i, /integrity/i, /transparent/i, /authentic/i,
      /trust/i, /faithful/i, /witness/i, /truthful/i, /candid/i,
      /speak\s+truth/i, /walk\s+in\s+(truth|light)/i, /bear\s+witness/i,
      /upright/i, /righteous/i, /righteousness/i, /blameless/i,
      /no\s+deception/i, /without\s+guile/i, /pure\s+heart/i,
      /honor/i, /noble/i, /true\s+to\s+one.?s\s+word/i,
    ],
  },
  {
    virtue: 'stewardship',
    patterns: [
      /steward/i, /protect/i, /preserve/i, /sustain/i, /restore/i,
      /cultivate/i, /guard/i, /nourish/i, /tend/i, /keep/i,
      /build/i, /create/i, /plant/i, /grow/i, /foster/i,
      /protect\s+(life|the\s+innocent|the\s+vulnerable|creation|nature)/i,
      /hospital/i, /school/i, /shelter/i, /refuge/i, /sanctuary/i,
      /rebuild/i, /renew/i, /redeem/i, /heal\s+the\s+land/i,
      /good\s+shepherd/i, /shepherd/i, /watchman/i, /keeper/i,
    ],
  },
  {
    virtue: 'redemptive purpose',
    patterns: [
      /pray/i, /prayer/i, /peace/i, /reconcil/i, /restore/i,
      /bring\s+life/i, /give\s+life/i, /second\s+chance/i, /new\s+beginning/i,
      /redemption/i, /redeem/i, /salvation/i, /save/i,
      /hope/i, /healing/i, /wholeness/i, /shalom/i,
      /turn\s+from\s+(evil|darkness|sin)/i, /repent/i, /conversion/i,
      /light\s+in\s+the\s+darkness/i, /bear\s+fruit/i, /living\s+water/i,
      /restore\s+(relationship|community|soul|land|health)/i,
    ],
  },
  {
    virtue: 'humility',
    patterns: [
      /humble/i, /humility/i, /serve/i, /service/i, /servant/i,
      /wisdom/i, /teach/i, /learn/i, /patient/i, /gentle/i,
      /meek/i, /lowly/i, /not\s+boast/i, /not\s+proud/i,
      /wash\s+feet/i, /least\s+of\s+these/i, /less\s+of\s+me/i,
      /listen/i, /understand/i, /seek\s+(wisdom|counsel|guidance)/i,
      /submission/i, /yield/i, /surrender/i, /contrite/i,
      /broken\s+spirit/i, /quiet\s+heart/i,
    ],
  },
  {
    virtue: 'justice',
    patterns: [
      /just/i, /justice/i, /righteousness/i, /equit/i, /fair/i,
      /dignity/i, /honor/i, /upright/i, /right/i,
      /defend\s+the\s+(weak|poor|oppressed|voiceless|widow|orphan)/i,
      /do\s+justice/i, /seek\s+justice/i, /protect\s+the\s+innocent/i,
      /speak\s+for/i, /advocate/i, /standing\s+for/i,
      /equal/i, /equality/i, /human\s+(rights|dignity|flourishing)/i,
      /rescue/i, /deliver/i, /set\s+free/i, /liberty/i,
      /righteous\s+judgment/i, /fair\s+treatment/i,
    ],
  },
  {
    virtue: 'peace',
    patterns: [
      /peace/i, /shalom/i, /harmony/i, /reconcil/i, /forgive/i,
      /grace/i, /unity/i, /restore/i, /gentle/i,
      /peacemaker/i, /peaceful/i, /calm/i, /still/i, /serene/i,
      /turn\s+the\s+other\s+cheek/i, /beat\s+swords/i, /nonviolence/i,
      /ceasefire/i, /truce/i, /diplomacy/i, /dialogue/i,
      /blessing/i, /bless/i, /pray\s+for\s+(peace|enemies|those\s+who)/i,
      /wholeness/i, /well.?being/i, /flourish/i,
    ],
  },
  {
    virtue: 'faith',
    patterns: [
      /faith/i, /hope/i, /belief/i, /trust\s+god/i, /trust\s+the\s+lord/i,
      /pray/i, /sacred/i, /divine/i, /holy/i, /bless/i,
      /worship/i, /praise/i, /glorify/i, /thanksgiving/i,
      /amen/i, /hallelujah/i, /maranatha/i, /alleluia/i,
      /spirit/i, /soul/i, /eternal/i, /everlasting/i,
      /covenant/i, /promise/i, /faithful/i, /trusting/i,
      /meditation/i, /contemplation/i, /devotion/i, /piety/i,
      /creed/i, /confession/i, /profess/i,
    ],
  },
  {
    virtue: 'hospitality',
    patterns: [
      /welcome/i, /shelter/i, /hospitality/i, /generous/i, /share/i,
      /community/i, /fellowship/i, /gather/i, /invite/i,
      /feed\s+the\s+(hungry|poor|stranger)/i, /clothe\s+the\s+naked/i,
      /visit\s+the\s+(sick|imprisoned|lonely)/i, /entertain\s+strangers/i,
      /open\s+(home|door|heart|table)/i, /break\s+bread/i,
      /companion/i, /neighbor/i, /kin/i, /family/i,
      /generosity/i, /liberal/i, /bountiful/i, /lavish/i,
    ],
  },
]

const CONCERN_PATTERNS: { concern: string; patterns: RegExp[] }[] = [
  {
    concern: 'destruction',
    patterns: [
      /destroy/i, /delete/i, /eliminate/i, /erase/i, /remove/i,
      /purge/i, /annihilate/i, /kill/i, /death/i, /die/i,
      /nuclear/i, /weapon/i, /war/i, /attack/i,
      /burn/i, /bomb/i, /explode/i, /obliterate/i,
      /wipe\s+out/i, /massacre/i, /slaughter/i, /genocide/i,
      /crusade/i, /jihad\s+of\s+violence/i, /holy\s+war/i,
      /ethnic\s+cleansing/i, /exterminate/i,
    ],
  },
  {
    concern: 'deception',
    patterns: [
      /deceive/i, /lie/i, /false/i, /manipulate/i, /trick/i,
      /mislead/i, /fake/i, /fraud/i, /deceit/i, /deception/i,
      /dishonest/i, /disingenuous/i, /duplicit/i,
      /false\s+witness/i, /bear\s+false/i, /lying/i,
      /conceal/i, /hidden\s+agenda/i, /secre/i, /backdoor/i,
      /without\s+disclosure/i, /undocumented/i, /unreported/i,
      /propaganda/i, /disinformation/i, /gaslight/i,
      /half.?truth/i, /whitewash/i, /cover.?up/i,
    ],
  },
  {
    concern: 'harm',
    patterns: [
      /harm/i, /hurt/i, /damage/i, /attack/i, /violen/i,
      /wound/i, /abuse/i, /cruel/i, /brutal/i, /savage/i,
      /torture/i, /maim/i, /cripple/i, /poison/i,
      /domestic\s+violence/i, /assault/i, /battery/i,
      /trauma/i, /traumatize/i, /suffer/i, /inflict/i,
      /predator/i, /prey/i, /victimize/i,
      /sadistic/i, /malicious/i, /vindictive/i,
    ],
  },
  {
    concern: 'exploitation',
    patterns: [
      /exploit/i, /coerce/i, /enslave/i, /oppress/i, /steal/i,
      /take\s+without/i, /unjust/i, /extort/i, /usury/i,
      /human\s+trafficking/i, /forced\s+labor/i, /child\s+labor/i,
      /price\s+gouge/i, /predatory/i, /loan.?shark/i,
      /discriminat/i, /bigot/i, /racist/i, /xenophobe/i,
      /marginalize/i, /disenfranchise/i, /dispossess/i,
      /land\s+grab/i, /colonize/i, /subjugate/i,
    ],
  },
  {
    concern: 'selfishness',
    patterns: [
      /selfish/i, /greed/i, /covet/i, /lust/i, /glutton/i,
      /pride/i, /arrogant/i, /haughty/i, /vain/i, /conceited/i,
      /boast/i, /self.?(righteous|serving|centered|absorbed)/i,
      /power\s+(over|grab|hunger|trip)/i, /control\s+others/i,
      /dominate/i, /tyranny/i, /dictator/i, /autocratic/i,
      /nepotism/i, /cronyism/i, /patronage/i,
      /hoard/i, /accumulate/i, /wealth\s+at\s+the\s+expense/i,
    ],
  },
]

const SACRED_TEXT_PATTERNS: RegExp[] = [
  /amen/i, /om\b/i, /shalom/i, /namaste/i, /soham/i,
  /hallelujah/i, /maranatha/i, /kyrie/i, /baruch/i,
  /bismillah/i, /om\s+mani/i, /sat\s+nam/i, /waheguru/i,
  /alhamdulillah/i, /subhanallah/i, /allahu\s+akbar/i,
  /holy/i, /sacred/i, /divine/i, /creator/i, /eternal/i,
  /light\s+of/i, /spirit/i, /soul/i, /prayer/i, /worship/i,
  /meditation/i, /contemplation/i, /blessing/i, /grace/i,
  /scripture/i, /gospel/i, /torah/i, /quran/i, /veda/i,
  /psalm/i, /proverb/i, /parable/i, /commandment/i,
  /covenant/i, /testament/i, /revelation/i, /prophet/i,
  /angel/i, /miracle/i, /glory/i, /throne/i, /altar/i,
  /temple/i, /tabernacle/i, /sanctuary/i, /ark/i,
  /heaven/i, /paradise/i, /kingdom\s+of/i, /eternal\s+life/i,
  /resurrection/i, /ascension/i, /transfiguration/i,
]

function scorePatterns(text: string, patterns: RegExp[]): number {
  if (!text || text.length === 0) return 0
  let matches = 0
  for (const p of patterns) {
    if (p.test(text)) matches++
  }
  return Math.min(1, matches / Math.max(1, patterns.length * 0.30))
}

function scoreGroups(
  text: string,
  groups: { label: string; patterns: RegExp[] }[],
): { score: number; matched: string[] } {
  const matched: string[] = []
  for (const g of groups) {
    for (const p of g.patterns) {
      if (p.test(text)) {
        matched.push(g.label)
        break
      }
    }
  }
  const score = groups.length > 0 ? matched.length / groups.length : 0
  return { score, matched }
}

const VIRTUE_GROUPS: { label: string; patterns: RegExp[] }[] = VIRTUE_PATTERNS.map(g => ({ label: g.virtue, patterns: g.patterns }))
const CONCERN_GROUPS: { label: string; patterns: RegExp[] }[] = CONCERN_PATTERNS.map(g => ({ label: g.concern, patterns: g.patterns }))

export function computeTrinitariumOverlay(input: TrinitariumOverlayInput): TrinitariumMoralScore {
  const text = input.proposalText || ''
  const intent = input.intent || text
  const searchSpace = `${text} ${intent}`

  const virtueResult = scoreGroups(searchSpace, VIRTUE_GROUPS)
  const concernResult = scoreGroups(searchSpace, CONCERN_GROUPS)
  const detectedVirtues = virtueResult.matched
  const detectedConcerns = concernResult.matched

  const sacredAffinity = scorePatterns(searchSpace, SACRED_TEXT_PATTERNS)

  let riskPenalty = 0
  if (input.riskLevel === 'high') riskPenalty = 0.25
  else if (input.riskLevel === 'medium') riskPenalty = 0.12

  let intentAlignment = 0.65
  if (detectedVirtues.length > 4) intentAlignment = 0.94
  else if (detectedVirtues.length > 2) intentAlignment = 0.84
  else if (detectedVirtues.length > 0) intentAlignment = 0.72
  else if (detectedVirtues.length === 0 && detectedConcerns.length > 2) intentAlignment = 0.25
  else if (detectedVirtues.length === 0 && detectedConcerns.length > 0) intentAlignment = 0.40
  if (input.riskLevel === 'high') intentAlignment = Math.max(0.12, intentAlignment - 0.30)

  const virtueScore = virtueResult.score
  const concernScore = concernResult.score
  const harmPotential = Math.max(0.05, Math.min(1, 1 - concernScore * 1.5))

  const virtueAlignment = Math.max(0.12, Math.min(0.98,
    virtueScore * 0.60 + harmPotential * 0.25 + sacredAffinity * 0.15
  ))

  const sacredBonus = sacredAffinity * 0.06
  const gematriaBonus = (input.gematriaResonance ?? 0.5) > 0.85 ? 0.03 : 0

  const rawScore = (
    virtueAlignment * 0.35 +
    harmPotential * 0.25 +
    intentAlignment * 0.30 +
    sacredBonus +
    gematriaBonus
  ) - riskPenalty

  const trinitariumMoralScore = Math.max(0.08, Math.min(0.98, rawScore))

  return {
    trinitariumMoralScore,
    virtueAlignment,
    harmPotential,
    intentAlignment,
    sacredTextAffinity: sacredAffinity,
    details: {
      detectedVirtues,
      detectedConcerns,
    },
  }
}

export function computeTrinitariumGematriaFusion(
  tmoScore: number,
  gematriaResonance: number,
): { trinitariumGematriaFusion: number; moralNumerologicalTension: string } {
  const fusion = Math.round(tmoScore * gematriaResonance * 100) / 100
  let tension: string
  if (fusion >= 0.60) tension = 'Aligned'
  else if (fusion >= 0.40) tension = 'Mild'
  else if (fusion >= 0.25) tension = 'Significant'
  else tension = 'Critical'
  return { trinitariumGematriaFusion: fusion, moralNumerologicalTension: tension }
}

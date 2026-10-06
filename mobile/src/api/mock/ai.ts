import type {
  Difficulty,
  Hazard,
  JobAnalysisComplete,
  Safety,
  Sector,
  SectorCheckResponse,
} from '../../lib/types/jobs';

/**
 * Deterministic stand-ins for the backend's AI models, so every branch of the
 * Add-work flow can be demonstrated on demand.
 *
 * Sector check (POST /sectors/check):
 *   sweeper / housekeeping / maid / cleaner → "Cleaning" (match)
 *   cook / chef                            → "Cooking"  (match)
 *   driver / chauffeur                     → "Driving"  (match)
 *   the exact name of an existing sector   → that sector (match)
 *   contains "helper" or "assistant"       → review (the AI is unsure)
 *   anything else                          → new
 *
 * Workplace photos (POST /admin/jobs/:id/photos), matched on file names + note:
 *   contains "unsafe"        → verdict unsafe (job blocked for review)
 *   contains the word "ai"   → rejected: ai_generated
 *   contains "random"        → rejected: unrelated
 *   otherwise                → pass; difficulty by photo count: 3 easy · 4–5 moderate · 6 hard
 */

const SECTOR_RULES: { pattern: RegExp; slug: string }[] = [
  { pattern: /(sweep|housekeep|maid|clean|janitor)/, slug: 'cleaning' },
  { pattern: /(cook|chef)/, slug: 'cooking' },
  { pattern: /(driver|driving|chauffeur)/, slug: 'driving' },
];

const REVIEW_PATTERN = /(helper|assistant)/;

export const SECTOR_CONFIDENCE = { match: 0.93, review: 0.55, new: 0.18 } as const;

export function checkSectorName(name: string, sectors: readonly Sector[]): SectorCheckResponse {
  const normalized = name.trim().toLowerCase();

  const exact = sectors.find((sector) => sector.name.toLowerCase() === normalized);
  if (exact) return { decision: 'match', sector: exact, confidence: 0.99 };

  for (const rule of SECTOR_RULES) {
    if (rule.pattern.test(normalized)) {
      const sector = sectors.find((candidate) => candidate.slug === rule.slug);
      if (sector) return { decision: 'match', sector, confidence: SECTOR_CONFIDENCE.match };
    }
  }

  if (REVIEW_PATTERN.test(normalized)) {
    return { decision: 'review', sector: null, confidence: SECTOR_CONFIDENCE.review };
  }
  return { decision: 'new', sector: null, confidence: SECTOR_CONFIDENCE.new };
}

// "ai" must be a separate word so names like "chair.jpg" or "main-hall.jpg" don't trigger it.
const AI_WORD = /(^|[^a-z])ai([^a-z]|$)/;

const SECTOR_HAZARDS: Record<string, Hazard[]> = {
  cooking: ['heat', 'sharp_tools'],
  cleaning: ['wet_floor', 'chemicals'],
  caretaking: ['heavy_lifting'],
  driving: ['traffic'],
  teaching: [],
};

function difficultyForCount(photoCount: number): Difficulty {
  if (photoCount <= 3) return 'easy';
  if (photoCount <= 5) return 'moderate';
  return 'hard';
}

export function analyseWorkplacePhotos(input: {
  photoNames: readonly string[];
  note: string;
  sectorSlug: string | null;
}): JobAnalysisComplete {
  const haystack = `${input.photoNames.join(' ')} ${input.note}`.toLowerCase();
  const count = input.photoNames.length;
  const sectorHazards = (input.sectorSlug && SECTOR_HAZARDS[input.sectorSlug]) || [];

  if (haystack.includes('unsafe')) {
    return {
      status: 'complete',
      verdict: 'unsafe',
      rejectionReason: null,
      difficulty: 'hard',
      safety: 'unsafe',
      authenticity: 'authentic',
      hazards: ['heights', 'electrical', 'poor_ventilation'],
      confidence: 0.88,
      summary:
        'The photos show exposed wiring and work at height without visible safety equipment. A moderator will review this job before it can be published.',
    };
  }

  if (AI_WORD.test(haystack)) {
    return {
      status: 'complete',
      verdict: 'rejected',
      rejectionReason: 'ai_generated',
      difficulty: difficultyForCount(count),
      safety: 'safe',
      authenticity: 'ai_generated',
      hazards: [],
      confidence: 0.91,
      summary: 'These images appear to be computer-generated rather than photos of a real workplace.',
    };
  }

  if (haystack.includes('random')) {
    return {
      status: 'complete',
      verdict: 'rejected',
      rejectionReason: 'unrelated',
      difficulty: difficultyForCount(count),
      safety: 'safe',
      authenticity: 'unrelated',
      hazards: [],
      confidence: 0.86,
      summary: 'The photos do not appear to show the workplace described in this job.',
    };
  }

  const difficulty = difficultyForCount(count);
  const safety: Safety = difficulty === 'hard' ? 'caution' : 'safe';
  const hazards: Hazard[] = difficulty === 'easy' ? sectorHazards.slice(0, 1) : [...sectorHazards];
  const effort = { easy: 'light', moderate: 'moderate', hard: 'demanding' }[difficulty];
  return {
    status: 'complete',
    verdict: 'pass',
    rejectionReason: null,
    difficulty,
    safety,
    authenticity: 'authentic',
    hazards,
    confidence: 0.9,
    summary: `A real, well-kept workplace. The work looks ${effort}${
      hazards.length > 0 ? ' with a few everyday precautions' : ''
    }.`,
  };
}

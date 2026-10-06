import type { Sector } from '../../../lib/types/jobs';
import { analyseWorkplacePhotos, checkSectorName, SECTOR_CONFIDENCE } from '../ai';

const sectors: Sector[] = [
  { id: 'sec_cleaning', slug: 'cleaning', name: 'Cleaning', jobCount: 4 },
  { id: 'sec_cooking', slug: 'cooking', name: 'Cooking', jobCount: 6 },
  { id: 'sec_driving', slug: 'driving', name: 'Driving', jobCount: 3 },
  { id: 'sec_teaching', slug: 'teaching', name: 'Teaching', jobCount: 2 },
];

describe('mock sector check', () => {
  it.each([
    ['Sweeper', 'cleaning'],
    ['housekeeping', 'cleaning'],
    ['Maid', 'cleaning'],
    ['Cook', 'cooking'],
    ['Head chef', 'cooking'],
    ['Driver', 'driving'],
    ['teaching', 'teaching'],
  ])('matches "%s" to %s', (name, slug) => {
    const result = checkSectorName(name, sectors);
    expect(result.decision).toBe('match');
    expect(result.sector?.slug).toBe(slug);
  });

  it('asks for review when unsure', () => {
    const result = checkSectorName('Shop helper', sectors);
    expect(result).toEqual({ decision: 'review', sector: null, confidence: SECTOR_CONFIDENCE.review });
  });

  it('proposes a new sector for anything else', () => {
    expect(checkSectorName('Gardening', sectors).decision).toBe('new');
  });
});

describe('mock workplace photo analysis', () => {
  const photos = (count: number) => Array.from({ length: count }, (_, index) => `IMG_${index}.jpg`);

  it('grades difficulty by photo count when the photos pass', () => {
    expect(analyseWorkplacePhotos({ photoNames: photos(3), note: '', sectorSlug: 'cooking' }).difficulty).toBe('easy');
    expect(analyseWorkplacePhotos({ photoNames: photos(4), note: '', sectorSlug: 'cooking' }).difficulty).toBe('moderate');
    expect(analyseWorkplacePhotos({ photoNames: photos(5), note: '', sectorSlug: 'cooking' }).difficulty).toBe('moderate');
    const hard = analyseWorkplacePhotos({ photoNames: photos(6), note: '', sectorSlug: 'cooking' });
    expect(hard).toMatchObject({ verdict: 'pass', difficulty: 'hard', safety: 'caution' });
  });

  it('blocks unsafe workplaces', () => {
    const result = analyseWorkplacePhotos({ photoNames: photos(3), note: 'unsafe wiring', sectorSlug: null });
    expect(result).toMatchObject({ verdict: 'unsafe', safety: 'unsafe' });
    expect(result.hazards.length).toBeGreaterThan(0);
  });

  it('rejects AI-generated and unrelated photos', () => {
    expect(analyseWorkplacePhotos({ photoNames: ['ai-kitchen.jpg', ...photos(2)], note: '', sectorSlug: null })).toMatchObject({
      verdict: 'rejected',
      rejectionReason: 'ai_generated',
    });
    expect(analyseWorkplacePhotos({ photoNames: photos(3), note: 'random pictures', sectorSlug: null })).toMatchObject({
      verdict: 'rejected',
      rejectionReason: 'unrelated',
    });
  });

  it('does not treat words that merely contain "ai" as AI-generated', () => {
    const result = analyseWorkplacePhotos({ photoNames: ['chair.jpg', 'main-hall.jpg', 'stairs.jpg'], note: '', sectorSlug: null });
    expect(result.verdict).toBe('pass');
  });
});

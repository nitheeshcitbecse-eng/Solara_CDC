import type { TFunction } from 'i18next';

import type { SectorRef } from '../types/jobs';
import { en } from './locales/en';

type KnownSector = keyof typeof en.enums.sector;

function isKnownSector(slug: string): slug is KnownSector {
  return slug in en.enums.sector;
}

/**
 * Sectors come from the API (any hirer can propose one), so only the seeded ones
 * have translations. Unknown sectors show the name the server sent.
 */
export function sectorLabel(t: TFunction, sector: Pick<SectorRef, 'slug' | 'name'>): string {
  return isKnownSector(sector.slug) ? t(`enums.sector.${sector.slug}`) : sector.name;
}

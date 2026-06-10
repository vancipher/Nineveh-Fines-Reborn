import type { Sector } from '@/lib/db/schema';
import { AXLE_WEIGHT_SECTOR_SLUG } from '@/lib/data/catalog';

export { AXLE_WEIGHT_SECTOR_SLUG };

export function isAxleWeightSector(sector: { slug: string } | null | undefined): boolean {
  return sector?.slug === AXLE_WEIGHT_SECTOR_SLUG;
}

export function sectorByIdMap(sectors: Sector[]): Map<string, Sector> {
  return new Map(sectors.map((s) => [s.id, s]));
}

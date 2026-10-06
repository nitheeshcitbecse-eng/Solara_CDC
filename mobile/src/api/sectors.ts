import type { Sector, SectorCheckResponse } from '../lib/types/jobs';
import { api } from './client';

export async function getSectors(): Promise<Sector[]> {
  const { data } = await api.get<Sector[]>('/sectors');
  return data;
}

export async function checkSector(name: string): Promise<SectorCheckResponse> {
  const { data } = await api.post<SectorCheckResponse>('/sectors/check', { name });
  return data;
}

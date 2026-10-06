import { useMutation, useQuery } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { checkSector, getSectors } from '../sectors';

export function useSectors() {
  // Sectors change rarely (only when a moderator approves a new one).
  return useQuery({ queryKey: queryKeys.sectors, queryFn: getSectors, staleTime: 5 * 60_000 });
}

export function useCheckSector() {
  return useMutation({ mutationFn: (name: string) => checkSector(name) });
}

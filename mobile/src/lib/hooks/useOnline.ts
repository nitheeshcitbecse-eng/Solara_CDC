import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** Live connectivity, from the same source TanStack Query uses (wired to NetInfo). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

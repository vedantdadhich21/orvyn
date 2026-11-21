'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { parseAppliedList, readAppliedRaw, type AppliedSimulation } from './applied';

/**
 * The approved simulation, as a React store. The raw string is the snapshot,
 * because the parsed object is a new value on every read and would re-render
 * forever. Parsing happens once per raw string.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('orvyn:applied', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('orvyn:applied', onStoreChange);
  };
}

function getServerSnapshot(): string {
  return '';
}

export function useApplied(draftId: string): AppliedSimulation | null {
  const getSnapshot = useCallback(() => readAppliedRaw(), []);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(
    () => parseAppliedList(raw).find((item) => item.draftId === draftId) ?? null,
    [raw, draftId],
  );
}

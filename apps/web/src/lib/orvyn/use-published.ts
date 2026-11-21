'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { parsePublishedList, readPublishedRaw, type PublishedStrategy } from './published';

/**
 * The local publish receipt, as a React store. The raw string is the snapshot
 * so the parsed object does not look new on every read.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('orvyn:published', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('orvyn:published', onStoreChange);
  };
}

function getServerSnapshot(): string {
  return '';
}

export function usePublished(draftId: string): PublishedStrategy | null {
  const getSnapshot = useCallback(() => readPublishedRaw(), []);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(
    () => parsePublishedList(raw).find((item) => item.draftId === draftId) ?? null,
    [raw, draftId],
  );
}

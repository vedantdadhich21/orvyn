'use client';

import { useSyncExternalStore } from 'react';

import { parseDrafts, readDraftsRaw, type PortfolioDraft } from './storage';

/**
 * localStorage as a React store. useSyncExternalStore gives the server a null
 * snapshot and the client the real one, so hydration stays clean and there is
 * no effect that writes state back into the component.
 */
let cachedRaw = '';
let cachedDraft: PortfolioDraft | null = null;

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('orvyn:drafts', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('orvyn:drafts', onStoreChange);
  };
}

function getSnapshot(): PortfolioDraft | null {
  const raw = readDraftsRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDraft = parseDrafts(raw)[0] ?? null;
  }
  return cachedDraft;
}

function getServerSnapshot(): null {
  return null;
}

export function useLatestDraft(): PortfolioDraft | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

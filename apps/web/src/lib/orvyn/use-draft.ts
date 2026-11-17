'use client';

import { useCallback, useSyncExternalStore } from 'react';

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

/** A draft by id, so a direct link works even if it is not the newest one. */
const byId = new Map<string, { raw: string; draft: PortfolioDraft | null }>();

export function useDraft(id: string): PortfolioDraft | null {
  const getForId = useCallback(() => {
    const raw = readDraftsRaw();
    const cached = byId.get(id);
    if (cached && cached.raw === raw) return cached.draft;
    const draft = parseDrafts(raw).find((item) => item.id === id) ?? null;
    byId.set(id, { raw, draft });
    return draft;
  }, [id]);

  return useSyncExternalStore(subscribe, getForId, getServerSnapshot);
}

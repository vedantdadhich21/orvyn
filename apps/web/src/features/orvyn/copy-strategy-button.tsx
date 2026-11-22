'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';

import { loadDraft, saveDraft } from '@/lib/orvyn/storage';
import { draftFromStrategy, parseStrategyPayload } from '@/lib/orvyn/strategy';

/**
 * Copying a published line is a local write: parse it, make a draft, save it,
 * then open the dashboard for that new draft. No wallet and no server.
 */
export function CopyStrategyButton({
  payload,
  variant = 'primary',
}: {
  payload: string;
  variant?: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = () => {
    setError(null);
    const parsed = parseStrategyPayload(payload);
    if (!parsed) {
      setError('This build cannot read that line.');
      return;
    }

    const draft = draftFromStrategy(parsed);
    saveDraft(draft);
    if (!loadDraft(draft.id)) {
      setError('The browser blocked local storage, so the copy could not be saved.');
      return;
    }

    setCopied(true);
    router.push(`/portfolio/${draft.id}`);
  };

  const className =
    variant === 'primary'
      ? 'inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90'
      : 'inline-flex items-center gap-1.5 rounded-lg border border-stroke-raised px-3.5 py-2 text-[11.5px] font-semibold text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink-primary';

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={copy} className={className}>
        {copied ? (
          <>
            <Check className="size-3.5" aria-hidden />
            Copied to your drafts
          </>
        ) : (
          <>
            <Copy className="size-3.5" aria-hidden />
            Copy this strategy
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[11px] text-amber-bright">
          <TriangleAlert className="size-3" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

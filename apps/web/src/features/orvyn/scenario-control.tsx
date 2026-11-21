'use client';

import { SectionLabel } from '@/components/primitives';
import { SCENARIOS, type Scenario } from '@/lib/orvyn/sim';
import { cn } from '@/lib/utils';

/**
 * The one place the simulated market is chosen. The dashboard and the
 * simulate screen share it so the scenario on screen is never ambiguous: both
 * read the same three ids, and the label under the control says what moved.
 */
export function ScenarioControl({
  scenario,
  onChange,
  label = 'Simulate a market move',
}: {
  scenario: Scenario;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div>
      <SectionLabel as="h3">{label}</SectionLabel>
      <div
        role="group"
        aria-label={label}
        className="mt-2 flex gap-1 rounded-lg border border-stroke-hairline bg-fill-subtle p-1">
        {SCENARIOS.map((item) => {
          const active = item.id === scenario.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.id)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-fill-active text-ink-primary'
                  : 'text-ink-secondary hover:bg-fill-press hover:text-ink-primary',
              )}>
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-quaternary">{scenario.detail}</p>
    </div>
  );
}

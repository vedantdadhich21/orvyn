import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Activity, ListChecks, SlidersHorizontal, Upload } from 'lucide-react';

import { Chip, Display, Panel, SandboxNote, SectionLabel } from '@/components/primitives';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The four steps behind ORVYN: pick the lines, write the rules, price the rebalance and publish the strategy.',
};

const STEPS = [
  {
    icon: ListChecks,
    title: 'Pick the lines',
    body: 'Choose the companies and keep cash as its own line. The draft is saved in this browser as you go.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Write the rules',
    body: 'A ceiling on any single company, a minimum cash balance and the drift that says when a rebalance is owed. Type a sentence or set the three limits by hand.',
  },
  {
    icon: Activity,
    title: 'See the drift and the trades',
    body: 'The dashboard prices the book, shows how far each line has moved and checks the rules. The simulator turns that into a trade list with the book on either side.',
  },
  {
    icon: Upload,
    title: 'Publish the strategy',
    body: 'The name, the limits and the target weights go to a public registry. Holdings, units, prices and addresses stay in the browser.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <div>
        <Chip tone="neutral">How it works</Chip>
        <Display as="h1" className="mt-4 text-3xl sm:text-4xl">
          Rules first, trades second
        </Display>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-ink-secondary">
          Most portfolios are a list of stocks and a feeling. ORVYN adds the part that can be
          checked: limits, a drift band and the trades those rules imply.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <Panel className="flex gap-4 p-5">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand-soft">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-faint">
                      0{index + 1}
                    </span>
                    <h2 className="text-[13.5px] font-semibold">{step.title}</h2>
                  </div>
                  <p className="mt-1.5 max-w-[54ch] text-[12px] leading-relaxed text-ink-secondary">
                    {step.body}
                  </p>
                </div>
              </Panel>
            </li>
          );
        })}
      </ol>

      <Panel className="p-5">
        <SectionLabel as="h2">What it does not do</SectionLabel>
        <ul className="mt-3 space-y-2">
          {[
            'No brokerage connection and no order is ever placed.',
            'No custody: the app never holds a key or a token.',
            'No real money: the book and the prices are simulated.',
            'No advice: the rules engine checks a plan, it does not recommend one.',
          ].map((line) => (
            <li key={line} className="flex gap-2 text-[12px] leading-relaxed text-ink-secondary">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
              {line}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-[#07130D] transition-colors hover:bg-brand/90">
          Build a portfolio
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href="/proof"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-tertiary transition-colors hover:text-ink-secondary">
          See what is onchain
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>

      <SandboxNote className="max-w-[58ch]">
        Simulated, testnet only. No real value and nothing here is investment advice.
      </SandboxNote>
    </div>
  );
}

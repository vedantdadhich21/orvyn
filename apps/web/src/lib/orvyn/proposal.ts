/**
 * From a sentence to a policy, without trusting the sentence.
 *
 * A model will read a person's words and answer with JSON. That answer is a
 * proposal, never a decision: it arrives as plain data, every value is checked
 * against the same limits the sliders use, and an unreadable or out-of-range
 * answer is rejected whole rather than quietly repaired. The product line
 * "AI explains, code decides" is this file.
 *
 * Chapter 1 also ships a small local reader, so the path can be exercised
 * without a key. It understands the phrasings below and nothing else, and it
 * says what it could not read instead of guessing.
 */
import { RULE_LIMITS, type Rules } from './rules';

export type RuleProposal = Partial<Record<keyof Rules, number>>;

const RULE_KEYS = ['ceilingPct', 'cashFloorPct', 'driftBandPct'] as const;

const LABELS: Record<keyof Rules, string> = {
  ceilingPct: 'The single company limit',
  cashFloorPct: 'The cash floor',
  driftBandPct: 'The drift band',
};

/** A clause is read for one of three ideas. Specific words win over general. */
const CASH = /\bcash\b|\bfloor\b/i;
const DRIFT = /\bdrift|\boff[\s-]?target|\bband\b|\brebalance\b|\bpoints?\b/i;
const CEILING =
  /\bceiling\b|\bstocks?\b|\bcompan|\bnames?\b|\bpositions?\b|\bholdings?\b|\blines?\b|\bsingle\b|\bcap\b|\bmax/i;

function isRuleKey(value: string): value is keyof Rules {
  return (RULE_KEYS as readonly string[]).includes(value);
}

function classify(clause: string): keyof Rules | null {
  if (CASH.test(clause)) return 'cashFloorPct';
  if (DRIFT.test(clause)) return 'driftBandPct';
  if (CEILING.test(clause)) return 'ceilingPct';
  return null;
}

/**
 * Read limits out of one sentence. Only whole percent, because that is what a
 * rule is; a stated 29.6 is rounded here, before anything reaches the check.
 * The first reading of each limit wins, so a later aside cannot override it.
 */
export function parseRuleSentence(text: string): {
  proposal: RuleProposal;
  /** Clauses that had a number or an idea, but not both. */
  unread: string[];
} {
  const proposal: RuleProposal = {};
  const unread: string[] = [];

  const clauses = text
    // A full stop ends a clause; a decimal point does not. Splitting on every
    // dot would turn "29.6" into two clauses and read 29 of it.
    .split(/(?:[;,\n]+|\.(?=\s|$)|\band\b)/i)
    .map((clause) => clause.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const key = classify(clause);
    const number = clause.match(/(\d+(?:\.\d+)?)/);

    if (!key || !number?.[1]) {
      unread.push(clause);
      continue;
    }
    if (proposal[key] !== undefined) continue;

    proposal[key] = Math.round(Number(number[1]));
  }

  return { proposal, unread };
}

export type ProposalCheck =
  | { ok: true; rules: Rules }
  | { ok: false; problems: string[] };

/**
 * Check an answer the way the sliders are checked: same key set, same bounds,
 * same whole-percent rule. Unmentioned limits keep their current value, so a
 * sentence about cash does not silently reset the ceiling.
 *
 * Nothing is clamped. Clamping is for storage, where the only alternative is
 * losing a draft; here the alternative is asking again.
 */
export function validateProposal(input: unknown, base: Rules): ProposalCheck {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, problems: ['The answer is not a set of limits.'] };
  }

  const problems: string[] = [];
  const rules: Rules = { ...base };
  let recognised = 0;

  for (const [key, value] of Object.entries(input)) {
    if (!isRuleKey(key)) {
      problems.push(`"${key}" is not a limit this build has.`);
      continue;
    }

    recognised += 1;

    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      problems.push(`${LABELS[key]} must be a whole number.`);
      continue;
    }

    const { min, max } = RULE_LIMITS[key];
    if (value < min || value > max) {
      problems.push(`${LABELS[key]} must be between ${min} and ${max}, not ${value}.`);
      continue;
    }

    rules[key] = value;
  }

  if (problems.length > 0) return { ok: false, problems };
  if (recognised === 0) return { ok: false, problems: ['The answer did not contain any limits.'] };

  return { ok: true, rules };
}

/** One sentence for a confirmation line, in the product's own words. */
export function describeRules(rules: Rules): string {
  const cash = rules.cashFloorPct === 0 ? 'no cash floor' : `${rules.cashFloorPct}% cash floor`;
  return `${rules.ceilingPct}% single company limit, ${cash}, ${rules.driftBandPct} point drift band`;
}

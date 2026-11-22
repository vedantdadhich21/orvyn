/**
 * Raw semantic design values, shared by every client.
 *
 * Platform-neutral on purpose: no React Native style objects, no CSS strings,
 * no `rem`. Mobile feeds these into `StyleSheet.create`; web emits them as CSS
 * custom properties. Anything that only one platform can consume — RN shadow
 * objects, `expo-google-fonts` family constants, Tailwind utilities — stays in
 * that client.
 *
 * These values are the maintained source of truth for the product's dark-only
 * visual language. A half-built light variant is worse than an honest absence.
 */

export const palette = {
  /** Page background. Everything sits on this. */
  bg: '#111214',
  /** Raised card surface — the holdings list, sheets, panels. */
  surface: '#17191D',
  /** Recessed surface, used behind the nav bar's glass. */
  surfaceSunken: '#0E1013',

  text: '#F5F6F7',

  /**
   * Primary brand colour. Named `brand`, not `accent`, because shadcn already
   * owns `--color-accent` for hover surfaces.
   */
  brand: '#2BD98B',
  /** Gradient terminus for brand fills (buttons, the mark). */
  brandDeep: '#1E8F63',
  /** Brand colour as text on dark — links, active values. */
  brandSoft: '#6FE7B4',
  /** Brand colour on chips and monospace ids. */
  brandDim: '#8FF0C6',

  /**
   * Legacy aliases. The screens inherited from TradeTokenStocks still reference
   * these names; they point at the accent so old routes render in the current
   * brand. New code should use `accent*`.
   */
  cobalt: '#2BD98B',
  cobaltDeep: '#1E8F63',
  cobaltText: '#6FE7B4',
  cobaltDim: '#8FF0C6',

  /** Legacy second tint, kept for avatar and mark gradients. */
  violet: '#1E8F63',

  positive: '#4ADE8B',
  /** Corporate actions, simulated badges, "needs review". */
  amber: '#E0A33C',
  amberBright: '#FFB066',
} as const;

/**
 * Text opacities. The design expresses hierarchy almost entirely through alpha
 * on a single ink colour rather than through separate greys, so these are the
 * real type-colour scale.
 */
export const ink = {
  primary: palette.text,
  secondary: 'rgba(242,243,245,0.72)',
  tertiary: 'rgba(242,243,245,0.62)',
  quaternary: 'rgba(242,243,245,0.56)',
  faint: 'rgba(242,243,245,0.50)',
} as const;

/** Hairline borders and translucent fills, all white-on-dark. */
export const stroke = {
  /** Default card and control border. */
  hairline: 'rgba(255,255,255,0.07)',
  /** Slightly stronger — segmented controls, chips. */
  raised: 'rgba(255,255,255,0.09)',
  /** On saturated cobalt fills. */
  onAccent: 'rgba(255,255,255,0.16)',
  /** The 1px top highlight that sits on cards and cobalt buttons. */
  specular: 'rgba(255,255,255,0.4)',
} as const;

export const fill = {
  /** Inactive segment / secondary card background. */
  subtle: 'rgba(255,255,255,0.03)',
  /** Segmented control track, chips. */
  muted: 'rgba(255,255,255,0.05)',
  /** Active segment thumb, active nav tab. */
  active: 'rgba(255,255,255,0.10)',
  /** Row hover/press. */
  press: 'rgba(255,255,255,0.035)',
} as const;

/**
 * Ambient dither-field ramps, ordered dark → light and layered over the page
 * background. Mobile drives a Skia shader with them; web uses them as gradient
 * stops. The ramp identifies what the surface is about, so they are named for
 * the screen rather than the hue.
 */
export const ramps = {
  /** Home and sign-in. The accent field, dimmer than the mark itself. */
  portfolio: ['#0F241B', '#17684A', '#2BD98B'],
  /** Company detail. A cooler green, so two legs still read as distinct. */
  company: ['#0E2018', '#155A3C', '#4FE0A3'],
  /** Strategy chart. Dimmer, because values are read off it. */
  strategy: ['#0C1B15', '#124A34', '#1E8F63'],
  /** Corporate actions. Warm — the only non-green state in the product. */
  corporateAction: ['#2E1C12', '#8A4020', '#FFB066'],
  /** Delegation. A muted green. */
  delegation: ['#0E2119', '#1B5C43', '#37B98A'],
  /** Connections. Teal-green — the one place the product talks about data pipes. */
  connections: ['#0D2420', '#16584C', '#5AD5C0'],
  /** Wallet and security. Deep, lock-like green. */
  wallet: ['#0C1A16', '#123F32', '#2FA37A'],
  /** Funding. Green, because this is the one screen about money arriving. */
  funding: ['#0E2A1E', '#1C6440', '#4ADE8B'],
  /** Sign-in. The accent field, wider and dimmer. */
  signIn: ['#0F241B', '#17684A', '#2BD98B'],
} as const satisfies Record<string, readonly [string, string, string]>;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  /** Segmented control outer. */
  segment: 18,
  /** Segmented control thumb. */
  segmentThumb: 14,
  /** Nav bar and its tabs. */
  nav: 24,
  navTab: 19,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 40,
  /** Horizontal screen padding — the design's `.pad`. */
  gutter: 20,
} as const;

/**
 * Typeface roles. Family names only — each client loads them its own way
 * (`@expo-google-fonts/*` on native, `next/font/google` on web), so the weight
 * constants live with the loader rather than here.
 */
export const typography = {
  /** Inter — the big balance number, screen titles and all UI text. */
  display: { family: 'Inter', weights: [600, 700] },
  /** Inter — all UI text. */
  sans: { family: 'Inter', weights: [400, 500, 600, 700] },
  /**
   * JetBrains Mono — every number the user might compare against another
   * number. Tabular figures are the whole point: a value that animates must use
   * this or it will jitter.
   */
  mono: { family: 'JetBrains Mono', weights: [400, 500] },
} as const;

/**
 * The design's motion signature: everything enters with the same rise curve at
 * staggered delays, so screens stagger consistently instead of each one
 * inventing its own timing.
 */
export const motion = {
  /** cubic-bezier(.2,.85,.25,1) from the source. */
  rise: [0.2, 0.85, 0.25, 1],
  riseDurationMs: 800,
  /** Delay between successive elements in an entrance stagger. */
  staggerMs: 60,
} as const;

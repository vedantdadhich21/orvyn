import { cn } from '@/lib/utils';

/**
 * The ORVYN mark: the ring from the logo, on its own.
 *
 * The full logo is a charcoal tile with a green ring inside it. On the app's
 * charcoal surfaces the tile is invisible, so the nav uses the ring alone and
 * the tile is reserved for contexts that have a light or unknown backdrop —
 * the favicon, the app icon, the profile picture. Both come from the same
 * source artwork, so they cannot drift apart.
 */
export function OrvynMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/brand/logo-ring.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      className={cn('shrink-0 select-none', className)}
    />
  );
}

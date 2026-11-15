/**
 * The ORVYN mark: the wordmark's O, charcoal on the brand green.
 *
 * Same artwork as the favicon, the app icon and the profile picture — all four
 * are exports of one outline, so they cannot drift apart. The path is the O from
 * Inter at weight 700, converted to an outline rather than redrawn, which is why
 * it holds its shape at 20px.
 */
const O_PATH = [
  'M765 24Q565 24 406-69.5Q247-163 155-335.5Q63-508 63-744Q63-982 155-1154.5',
  'Q247-1327 406-1420.5Q565-1514 765-1514Q966-1514 1124.5-1420.5',
  'Q1283-1327 1375.5-1154.5Q1468-982 1468-744Q1468-508 1375.5-335.5',
  'Q1283-163 1124.5-69.5Q966 24 765 24Z',
  'M765-248Q880-248 969-306Q1058-364 1108-475Q1158-586 1158-744',
  'Q1158-903 1108-1014.5Q1058-1126 969-1184Q880-1242 765-1242',
  'Q651-1242 562-1184Q473-1126 423-1014.5Q373-903 373-744',
  'Q373-586 423-475Q473-364 562-306Q651-248 765-248Z',
].join('');

export function OrvynMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      shapeRendering="geometricPrecision"
      className={className}>
      <rect width="1000" height="1000" fill="#2BD98B" />
      <g transform="translate(181.456 810.013) scale(0.416125)">
        <path d={O_PATH} fill="#111214" />
      </g>
    </svg>
  );
}

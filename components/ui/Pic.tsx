/**
 * A responsive still from public/campaign: AVIF first, WebP as the fallback,
 * at 640/960/1440 wide (built by docs/build/imagery/tools/encode.cjs).
 * `mobile` art-directs a different crop below 860px (e.g. a short band).
 * Lazy and async by default; the box around it sets the aspect, so the image
 * never moves the layout. Pass `eager` only for a still above the fold.
 * `blank` names a media query where the still is hidden by CSS: there it
 * resolves to an inline 1px GIF, so an eager image costs no request.
 */
const WIDTHS = [640, 960, 1440];
const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const set = (name: string, ext: string) => WIDTHS.map((w) => `/campaign/${name}-${w}.${ext} ${w}w`).join(", ");

export default function Pic({
  name,
  mobile,
  sizes,
  mobileSizes,
  width,
  height,
  alt,
  className,
  eager = false,
  mq = "(max-width: 860px)",
  blank,
}: {
  name: string;
  mobile?: string;
  sizes: string;
  mobileSizes?: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  eager?: boolean;
  /** where the `mobile` crop takes over (the page's own breakpoint) */
  mq?: string;
  /** media query where the still is not shown (served a 1px GIF instead) */
  blank?: string;
}) {
  const MQ = mq;
  return (
    <picture>
      {blank && <source media={blank} srcSet={BLANK} />}
      {mobile && <source media={MQ} type="image/avif" srcSet={set(mobile, "avif")} sizes={mobileSizes ?? sizes} />}
      {mobile && <source media={MQ} type="image/webp" srcSet={set(mobile, "webp")} sizes={mobileSizes ?? sizes} />}
      <source type="image/avif" srcSet={set(name, "avif")} sizes={sizes} />
      <img
        className={className}
        src={`/campaign/${name}-960.webp`}
        srcSet={set(name, "webp")}
        sizes={sizes}
        width={width}
        height={height}
        loading={eager ? undefined : "lazy"}
        decoding="async"
        alt={alt}
      />
    </picture>
  );
}

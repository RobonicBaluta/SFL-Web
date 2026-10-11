"use client";

import Photo from "./Photo";

const KEYWORDS: Record<string, [number, number]> = {
  center: [50, 50],
  top: [50, 0],
  bottom: [50, 100],
  left: [0, 50],
  right: [100, 50]
};

/** coverPosition ("top", "50% 40%"…) → the point it keeps in view, in percent. */
function toPoint(position: string): [number, number] {
  if (KEYWORDS[position]) return KEYWORDS[position];
  const match = /^(\d+)% (\d+)%$/.exec(position);
  return match ? [Number(match[1]), Number(match[2])] : [50, 50];
}

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * The site crops the cover differently on event cards (16:9) and on the event
 * page header (about 21:9). Clicking the photo sets the point both crops keep.
 */
export default function CoverFraming({
  src,
  fallback,
  position,
  onChange
}: {
  src: string;
  fallback?: string;
  position: string;
  onChange: (position: string) => void;
}) {
  const [x, y] = toPoint(position);

  function pick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = clamp(((e.clientX - rect.left) / rect.width) * 100);
    const py = clamp(((e.clientY - rect.top) / rect.height) * 100);
    onChange(`${px}% ${py}%`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_3fr]">
      <div>
        <p className="text-sm">Tap the most important spot (faces, title).</p>
        <div className="relative mt-2 inline-block">
          <Photo
            src={src}
            fallback={fallback}
            alt="Cover"
            onClick={pick}
            className="block max-h-80 w-auto max-w-full cursor-crosshair border-2 border-sfl-black"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-sfl-gold bg-sfl-black/40"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Event card</p>
          <div className="mt-1 aspect-[16/9] w-full max-w-sm overflow-hidden border-2 border-sfl-black">
            <Photo src={src} fallback={fallback} alt="" className="h-full w-full object-cover" style={{ objectPosition: position }} />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">Event page header</p>
          <div className="mt-1 aspect-[21/9] w-full overflow-hidden border-2 border-sfl-black">
            <Photo src={src} fallback={fallback} alt="" className="h-full w-full object-cover" style={{ objectPosition: position }} />
          </div>
        </div>
      </div>
    </div>
  );
}

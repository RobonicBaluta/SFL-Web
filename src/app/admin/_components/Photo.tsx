"use client";

import { useState } from "react";

/**
 * An <img> that switches to `fallback` if `src` fails, e.g. a photo committed
 * moments ago that the live site doesn't serve until the deploy finishes.
 */
export default function Photo({
  src,
  fallback,
  alt,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; fallback?: string; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const current = failedSrc === src && fallback ? fallback : src;
  return <img {...rest} alt={alt} src={current} onError={() => current === src && setFailedSrc(src)} />;
}

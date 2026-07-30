"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("eventDetail");
  const [index, setIndex] = useState(-1);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={t("openImage")}
            onClick={() => setIndex(i)}
            className="relative aspect-[4/3] overflow-hidden border-2 border-sfl-black"
          >
            <Image
              src={src}
              alt={`${title} ${i + 1}`}
              fill
              sizes="(min-width: 768px) 33vw, 50vw"
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
        ))}
      </div>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={images.map((src) => ({ src }))}
      />
    </div>
  );
}

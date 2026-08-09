import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getInstagramPosts } from "@/lib/instagram";
import { siteConfig } from "@/site.config";

export default async function InstagramSection() {
  const profileUrl = siteConfig.social.find((s) => s.name === "Instagram")?.url ?? "";
  const posts = getInstagramPosts();
  if (profileUrl === "" || posts.length === 0) return null;

  const t = await getTranslations("instagram");

  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl font-bold uppercase">{t("title")}</h2>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-display font-bold uppercase text-sfl-gold hover:text-sfl-black"
        >
          {t("handle")}
        </a>
      </div>

      {/* Grid with items-start, not a multi-column layout: posts keep their own
          portrait/landscape/square shape (nothing cropped) while grid's minmax(0,1fr)
          tracks keep the 1080px images from overflowing the viewport. */}
      <ul className="grid grid-cols-2 items-start gap-4 md:grid-cols-4">
        {posts.map((post) => (
          <li key={post.url} className="min-w-0">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden border-2 border-sfl-black transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sfl-gold)]"
            >
              <Image
                src={`/instagram/${post.image}`}
                alt={post.caption ?? t("postAlt")}
                width={post.width ?? 1080}
                height={post.height ?? 1080}
                sizes="(min-width: 768px) 25vw, 50vw"
                className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
              />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-sfl-black px-6 py-3 font-display font-bold uppercase text-sfl-gold transition-colors hover:bg-sfl-gray"
        >
          {t("cta")}
        </a>
      </div>
    </section>
  );
}

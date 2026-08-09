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

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {posts.map((post) => (
          <li key={post.url}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden border-2 border-sfl-black transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sfl-gold)]"
            >
              <div className="relative aspect-square">
                <Image
                  src={`/instagram/${post.image}`}
                  alt={post.caption ?? t("postAlt")}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
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

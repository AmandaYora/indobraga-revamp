import { useEffect } from "react";
import { pageSeo, organizationJsonLd, websiteJsonLd } from "@/modules/site/lib/seo";
import { useSiteSettingsStore } from "@/modules/site/stores/site-settings.store";

export interface SeoInput {
  title?: string | null;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: string;
  noindex?: boolean;
  article?: {
    publishedTime?: string | null;
    modifiedTime?: string | null;
    section?: string | null;
  } | null;
  /** JSON-LD tambahan (mis. Article) — DITAMBAHKAN setelah Organization + WebSite. */
  jsonLd?: Record<string, unknown>[];
}

const SERVER_SEO_SELECTOR = "[data-server-seo]";

/**
 * SEO sisi client (React 19 metadata native) — setara `head()` root + route legacy.
 * Tag server/statis diberi atribut `data-server-seo`; setelah `<Seo>` pertama mount, tag itu
 * dihapus agar tidak duplikat — tepat 1 title, 1 canonical (publik), 1 set og:* (BC-20).
 * Judul/deskripsi/OG default dari Pengaturan admin bila halaman tidak menentukan (BC-21).
 */
export function Seo(input: SeoInput) {
  const settings = useSiteSettingsStore((state) => state.settings);
  const fallbackTitle = settings.seo?.title ?? undefined;
  const fallbackDescription = settings.seo?.description ?? undefined;
  const fallbackImage = settings.seo?.og_image_url ?? undefined;

  const tags = pageSeo({
    title: input.title ?? fallbackTitle ?? undefined,
    description: input.description ?? fallbackDescription ?? undefined,
    path: input.path,
    image: input.image ?? fallbackImage ?? undefined,
    type: input.type,
    noindex: input.noindex,
  });

  useEffect(() => {
    document
      .querySelectorAll(SERVER_SEO_SELECTOR)
      .forEach((node) => node.parentNode?.removeChild(node));
  }, []);

  // Paritas root legacy: Organization + WebSite di semua halaman; halaman boleh menambah.
  const jsonLdScripts = [organizationJsonLd(), websiteJsonLd(), ...(input.jsonLd ?? [])];

  return (
    <>
      <title>{tags.title}</title>
      <meta name="description" content={tags.description} />
      <meta name="robots" content={tags.robots} />
      <meta name="author" content="PT. Braga Indonesia Perkasa" />
      {tags.canonical ? <link rel="canonical" href={tags.canonical} /> : null}
      <meta property="og:site_name" content="Indobraga" />
      <meta property="og:title" content={tags.og.title} />
      <meta property="og:description" content={tags.og.description} />
      <meta property="og:type" content={tags.og.type} />
      <meta property="og:url" content={tags.og.url} />
      {tags.og.image ? <meta property="og:image" content={tags.og.image} /> : null}
      <meta name="twitter:card" content={tags.twitter.card} />
      <meta name="twitter:title" content={tags.twitter.title} />
      <meta name="twitter:description" content={tags.twitter.description} />
      {tags.twitter.image ? <meta name="twitter:image" content={tags.twitter.image} /> : null}
      {input.type === "article" ? (
        <>
          {input.article?.publishedTime ? (
            <meta property="article:published_time" content={input.article.publishedTime} />
          ) : null}
          {input.article?.modifiedTime ? (
            <meta property="article:modified_time" content={input.article.modifiedTime} />
          ) : null}
          {input.article?.section ? (
            <meta property="article:section" content={input.article.section} />
          ) : null}
        </>
      ) : null}
      {jsonLdScripts.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </>
  );
}

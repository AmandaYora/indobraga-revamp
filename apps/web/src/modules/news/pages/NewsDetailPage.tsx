import { Link, useLoaderData, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { formatDateId } from "@/shared/lib/date";
import type { ContractSchemas } from "@/shared/types/contract";
import { Seo } from "@/modules/site/components/Seo";
import { PublicErrorState } from "@/modules/site/components/PublicErrorState";
import { siteService } from "@/modules/site/services/site.service";
import type { NewsDetailLoaderData } from "@/modules/site/services/public.loaders";
import { articleJsonLd } from "@/modules/site/lib/seo";
import NotFoundPage from "@/modules/site/pages/NotFoundPage";
import { ArticleDetailSkeleton } from "@/modules/news/components/NewsSkeletons";

type PublicNewsDetail = ContractSchemas["PublicNewsDetail"];

/** Detail berita; slug tidak dikenal → Not Found (BC-22). */
export default function NewsDetailPage() {
  const { slug = "" } = useParams();
  const loaderData = useLoaderData() as NewsDetailLoaderData | null;

  if (loaderData?.notFound) {
    return <NotFoundPage />;
  }

  return <NewsDetailContent key={slug} slug={slug} initialDetail={loaderData?.detail ?? null} />;
}

/** Port 1:1 `NewsDetailPage` di `routes/_public.berita.$slug.tsx` legacy. */
function NewsDetailContent({
  slug,
  initialDetail,
}: {
  slug: string;
  initialDetail: PublicNewsDetail | null;
}) {
  const {
    data: item,
    error,
    loading,
    reload,
  } = useApiQuery(["public", "news-detail", slug], () => siteService.newsDetail(slug), {
    initialData: initialDetail,
    refetchOnMount: false,
  });

  if (loading && !item) {
    return <ArticleDetailSkeleton />;
  }

  if (error || !item) {
    return (
      <>
        <Seo
          title="Berita tidak ditemukan - Indobraga"
          description="Halaman berita Indobraga tidak ditemukan."
          path="/berita"
          noindex
        />
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <PublicErrorState
            error={error ?? new Error("Berita tidak ditemukan.")}
            onRetry={reload}
          />
        </article>
      </>
    );
  }

  const image = item.seo.og_image_url ?? item.thumbnail_url ?? null;
  const publishedAt = item.published_at ?? "";

  return (
    <>
      <Seo
        title={item.seo.title ?? item.title}
        description={item.seo.description ?? item.excerpt}
        path={`/berita/${item.slug}`}
        image={image}
        type="article"
        article={{ publishedTime: publishedAt, modifiedTime: publishedAt, section: item.category }}
        jsonLd={[
          articleJsonLd({
            title: item.title,
            excerpt: item.excerpt,
            slug: item.slug,
            date: publishedAt,
            thumb: image,
            category: item.category,
          }),
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          to="/berita?page=1"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="rounded-full bg-accent/20 px-2.5 py-0.5 font-semibold text-accent-foreground">
            {item.category}
          </span>
          <span className="text-muted-foreground">{formatDateId(item.published_at ?? "")}</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-primary-deep sm:text-4xl">
          {item.title}
        </h1>
        <OptionalImage
          src={item.thumbnail_url}
          alt={item.title}
          className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-card"
          placeholderClassName="mt-8 aspect-[16/9] w-full rounded-2xl shadow-card"
        />
        <p className="mt-8 text-lg leading-relaxed text-foreground/80">{item.excerpt}</p>
        <div className="mt-6 space-y-4 text-foreground/80">
          {item.content.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </>
  );
}

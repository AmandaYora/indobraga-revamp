import { Link, useLoaderData, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { OptionalImage } from "@/shared/components/ui/media-placeholder";
import { Seo } from "@/modules/site";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { siteService } from "@/modules/site";
import { fallbackNewsDetail } from "@/modules/site/lib/fallbacks";
import { articleJsonLd } from "@/modules/site/lib/seo";
import { formatDateId } from "@/shared/lib/date";
import { newsListPath } from "@/app/routes/route-paths";
import NotFoundPage from "@/modules/site/pages/NotFoundPage";
import type { ContractSchemas } from "@/shared/types/contract";
import { ArticleDetailSkeleton } from "@/modules/news/components/NewsSkeletons";

export default function NewsDetailPage() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const loaderData = useLoaderData() as {
    detail: ContractSchemas["PublicNewsDetail"] | null;
    page: number;
    slug: string;
    notFound: boolean;
  } | null;
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : (loaderData?.page ?? 1);

  // Slug tidak ada → Not Found (BC-22); loader sudah menandainya.
  if (loaderData?.notFound) {
    return <NotFoundPage />;
  }

  return <NewsDetailContent slug={slug} page={page} initial={loaderData?.detail ?? null} />;
}

function NewsDetailContent({
  slug,
  page,
  initial,
}: {
  slug: string;
  page: number;
  initial: ContractSchemas["PublicNewsDetail"] | null;
}) {
  const { data, error, loading } = useApiQuery(
    ["public", "news-detail", slug],
    () => siteService.newsDetail(slug),
    {
      initialData: initial ?? (slug ? fallbackNewsDetail(slug) : null),
      refetchOnMount: false,
    },
  );
  const detail = data ?? (slug ? fallbackNewsDetail(slug) : null);

  if (loading && !data) return <ArticleDetailSkeleton />;
  // Slug tidak ada → Not Found (BC-22; bukan soft-404).
  if ((error && !data) || (!loading && !detail)) {
    return <NotFoundPage />;
  }
  if (!detail) return <ArticleDetailSkeleton />;

  return (
    <>
      <Seo
        title={detail.seo?.title ?? detail.title}
        description={detail.seo?.description ?? detail.excerpt}
        path={`/berita/${detail.slug}`}
        image={detail.seo?.og_image_url ?? detail.thumbnail_url}
        type="article"
        article={{
          publishedTime: detail.published_at,
          modifiedTime: detail.published_at,
          section: detail.category,
        }}
        jsonLd={[
          articleJsonLd({
            title: detail.title,
            excerpt: detail.excerpt,
            slug: detail.slug,
            date: detail.published_at,
            thumb: detail.thumbnail_url,
            category: detail.category,
          }),
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 py-16">
        <Link
          to={newsListPath(page)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-primary">
          {detail.category}
          {detail.published_at ? (
            <span className="ml-2 font-normal normal-case text-muted-foreground">
              {formatDateId(detail.published_at, "long")}
            </span>
          ) : null}
        </p>
        <h1 className="mt-2 text-balance text-3xl font-bold sm:text-4xl">{detail.title}</h1>
        {detail.thumbnail_url ? (
          <OptionalImage
            src={detail.thumbnail_url}
            alt={detail.title}
            className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover"
            loading="eager"
          />
        ) : null}
        {detail.excerpt ? (
          <p className="mt-6 text-lg text-muted-foreground">{detail.excerpt}</p>
        ) : null}
        <div className="mt-4 space-y-4">
          {detail.content.map((paragraph, index) => (
            <p key={index} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </>
  );
}

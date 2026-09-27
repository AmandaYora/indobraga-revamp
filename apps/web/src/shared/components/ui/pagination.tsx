import { cn } from "@/shared/lib/cn";

export interface PaginationInfo {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  start: number;
  end: number;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function pageItems(page: number, pageCount: number): (number | "ellipsis")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, 2, page - 1, page, page + 1, pageCount - 1, pageCount]);
  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous !== 0 && value - previous > 1) items.push("ellipsis");
    items.push(value);
    previous = value;
  }
  return items;
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  start,
  end,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = "data",
}: PaginationInfo & {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <p className="text-sm text-muted-foreground">
        Menampilkan {total === 0 ? 0 : start}–{end} dari {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground" htmlFor="page-size">
          Per halaman
        </label>
        <select
          id="page-size"
          className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <nav aria-label="Navigasi halaman" className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-input px-2 py-1 text-sm disabled:opacity-50"
          >
            Sebelumnya
          </button>
          {pageItems(page, Math.max(1, pageCount)).map((item, index) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  "rounded-lg border px-2 py-1 text-sm",
                  item === page
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-input px-2 py-1 text-sm disabled:opacity-50"
          >
            Berikutnya
          </button>
        </nav>
      </div>
    </div>
  );
}

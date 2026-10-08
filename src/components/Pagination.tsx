import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/lib/paginate";

/**
 * Link-based pagination: works without JavaScript, keeps every other query
 * parameter, and each page is a real, shareable URL.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  hrefFor,
  label = "items",
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
  label?: string;
  className?: string;
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={clsx(
        "flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row",
        className,
      )}
    >
      <p className="text-sm text-slate tabular">
        Showing {first}–{last} of {total} {label}
      </p>

      {pageCount > 1 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          <li>
            {page > 1 ? (
              <Link
                href={hrefFor(page - 1)}
                rel="prev"
                aria-label="Previous page"
                className="flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-sm hover:border-ink/40"
              >
                <ChevronLeft size={15} /> Prev
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex h-9 cursor-not-allowed items-center gap-1 rounded-full border border-line bg-white px-3 text-sm text-slate/50"
              >
                <ChevronLeft size={15} /> Prev
              </span>
            )}
          </li>

          {pageWindow(page, pageCount).map((p, i) =>
            p === -1 ? (
              <li key={`gap-${i}`} aria-hidden className="px-1 text-sm text-slate">
                …
              </li>
            ) : (
              <li key={p}>
                <Link
                  href={hrefFor(p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Page ${p}`}
                  className={clsx(
                    "flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm tabular transition-colors",
                    p === page
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-ink hover:border-ink/40",
                  )}
                >
                  {p}
                </Link>
              </li>
            ),
          )}

          <li>
            {page < pageCount ? (
              <Link
                href={hrefFor(page + 1)}
                rel="next"
                aria-label="Next page"
                className="flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-sm hover:border-ink/40"
              >
                Next <ChevronRight size={15} />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex h-9 cursor-not-allowed items-center gap-1 rounded-full border border-line bg-white px-3 text-sm text-slate/50"
              >
                Next <ChevronRight size={15} />
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}

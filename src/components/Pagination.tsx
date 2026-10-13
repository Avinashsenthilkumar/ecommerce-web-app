import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/lib/paginate";

const BASE = "flex h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors";
const IDLE = "border-line bg-white text-ink hover:border-ink/40";
const OFF = "border-line bg-white text-slate/50 cursor-not-allowed";

/**
 * Link-based pagination: works without JavaScript, keeps every other query
 * parameter, and each page is a real, shareable URL.
 *
 * The controls stay on screen when everything fits on one page, disabled rather
 * than absent, so paging is visibly part of the list rather than something that
 * appears out of nowhere once the data grows.
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

      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" aria-label="Previous page" className={clsx(BASE, IDLE)}>
              <ChevronLeft size={15} /> Prev
            </Link>
          ) : (
            <span aria-disabled="true" className={clsx(BASE, OFF)}>
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
                  p === page ? "border-ink bg-ink text-white" : IDLE,
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} rel="next" aria-label="Next page" className={clsx(BASE, IDLE)}>
              Next <ChevronRight size={15} />
            </Link>
          ) : (
            <span aria-disabled="true" className={clsx(BASE, OFF)}>
              Next <ChevronRight size={15} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/**
 * The same control for a list the browser already holds — report panels and
 * work queues that page without a round trip.
 */
export function ClientPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  label = "items",
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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

      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={clsx(BASE, page > 1 ? IDLE : OFF)}
          >
            <ChevronLeft size={15} /> Prev
          </button>
        </li>

        {pageWindow(page, pageCount).map((p, i) =>
          p === -1 ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-sm text-slate">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Page ${p}`}
                className={clsx(
                  "flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm tabular transition-colors",
                  p === page ? "border-ink bg-ink text-white" : IDLE,
                )}
              >
                {p}
              </button>
            </li>
          ),
        )}

        <li>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className={clsx(BASE, page < pageCount ? IDLE : OFF)}
          >
            Next <ChevronRight size={15} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

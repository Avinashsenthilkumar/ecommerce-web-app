/** Page number from a query string, clamped to a sane range. */
export function pageFromParam(value: string | undefined, pageCount = Infinity) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, Number.isFinite(pageCount) ? Math.max(1, pageCount) : n);
}

export type Paged<T> = {
  items: T[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
};

/** Slices an in-memory list. Used where the whole set is already loaded. */
export function paginate<T>(rows: T[], page: number, pageSize: number): Paged<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    items: rows.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    pageCount,
    pageSize,
    total,
  };
}

/**
 * Page numbers to render, with -1 marking a gap.
 * e.g. 1 … 4 5 [6] 7 8 … 20
 */
export function pageWindow(page: number, pageCount: number, span = 1): number[] {
  if (pageCount <= 1) return [1];
  const pages = new Set<number>([1, pageCount]);
  for (let p = page - span; p <= page + span; p++) {
    if (p >= 1 && p <= pageCount) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: number[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push(-1);
    out.push(p);
    previous = p;
  }
  return out;
}

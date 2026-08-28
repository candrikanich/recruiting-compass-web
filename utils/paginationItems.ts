export type PaginationItem = number | "ellipsis";

/**
 * Build a compact page list for pagination controls.
 *
 * Always includes first + last. For windows larger than 7 pages, shows the
 * current page plus one neighbor on each side, with ellipses for gaps.
 */
export function paginationItems(
  page: number,
  totalPages: number,
): PaginationItem[] {
  const total = Number.isFinite(totalPages) ? Math.floor(totalPages) : 0;
  if (total < 1) return [];

  const current = Number.isFinite(page)
    ? Math.min(Math.max(Math.floor(page), 1), total)
    : 1;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PaginationItem[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let n = start; n <= end; n++) items.push(n);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

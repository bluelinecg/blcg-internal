'use client';

/**
 * Pagination controls for paginated list views.
 * Renders Previous / page number buttons / Next.
 * Returns null when totalPages <= 1 so callers need no conditional rendering.
 *
 * Props:
 *   page         — current 1-indexed page number
 *   totalPages   — total number of pages
 *   onPageChange — called with target page number on navigation
 *   siblingCount — pages shown either side of the current page (default: 1)
 *   className    — additional wrapper classes
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageRange(page, totalPages, siblingCount);

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <PageButton
        label="← Prev"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      />

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-gray-400 select-none">
            …
          </span>
        ) : (
          <PageButton
            key={p}
            label={String(p)}
            onClick={() => onPageChange(p as number)}
            active={p === page}
          />
        )
      )}

      <PageButton
        label="Next →"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      />
    </div>
  );
}

// --- Internal helpers ---

interface PageButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function PageButton({ label, onClick, disabled = false, active = false }: PageButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-8 px-2 py-1 rounded text-sm font-medium transition-colors
        ${active
          ? 'bg-brand-blue text-white'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      {label}
    </button>
  );
}

/**
 * Builds the array of page numbers (and '...' ellipsis markers) to render.
 * Always includes first page, last page, and siblingCount pages around current.
 */
function buildPageRange(
  current: number,
  total: number,
  siblingCount: number,
): (number | '...')[] {
  const range: (number | '...')[] = [];

  const left  = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);

  range.push(1);

  if (left > 2) range.push('...');

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < total - 1) range.push('...');

  if (total > 1) range.push(total);

  return range;
}

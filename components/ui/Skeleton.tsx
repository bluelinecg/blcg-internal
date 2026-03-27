interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ''}`} />;
}

interface ColumnConfig {
  /** Tailwind width class for the cell skeleton, e.g. "w-32". Defaults to "w-24". */
  width?: string;
  /** If true, renders a circular avatar + text side-by-side in this cell. */
  avatar?: boolean;
}

interface TableSkeletonProps {
  /** Number of body rows to render. Defaults to 5. */
  rows?: number;
  /** Column definitions — one entry per column. */
  columns: ColumnConfig[];
}

/**
 * Renders an animate-pulse table skeleton that mirrors the real table structure.
 * Drop in wherever a Spinner was previously shown inside a table page.
 */
export function TableSkeleton({ rows = 5, columns }: TableSkeletonProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100">
          {columns.map((col, i) => (
            <th key={i} className="px-6 py-3">
              <Skeleton className={`h-3 ${col.width ?? 'w-20'}`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, ri) => (
          <tr key={ri}>
            {columns.map((col, ci) => (
              <td key={ci} className="px-6 py-4">
                {col.avatar ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
                    <Skeleton className={`h-4 ${col.width ?? 'w-32'}`} />
                  </div>
                ) : (
                  <Skeleton className={`h-4 ${col.width ?? 'w-24'}`} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import React from "react";
import { EmptyState, ErrorState, SkeletonBlock } from "./Feedback";

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "No Records Available",
  emptyDescription = "Records appear here automatically once activity is submitted.",
  emptyAction,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading records">
        {[1, 2, 3, 4].map((n) => (
          <SkeletonBlock key={n} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#DCE4EC] text-[#5A6B7C] bg-[#F6F8FA]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`py-3 px-3 font-semibold font-heading whitespace-nowrap ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EDF2F7]">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-[#F6F8FA] transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-3 align-middle ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

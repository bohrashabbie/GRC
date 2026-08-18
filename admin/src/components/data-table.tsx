"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"
import { useTranslations } from "next-intl"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"

const ACTIONS_COLUMN = "actions"

/** The actions column is as wide as its buttons and no wider, so it stays a
 * narrow strip the eye can run down instead of a moving target. */
function cellClassName(columnId: string): string | undefined {
  return columnId === ACTIONS_COLUMN ? "w-px whitespace-nowrap" : undefined
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: TData) => void
  emptyTitle?: string
  emptyDescription?: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

/** Every data grid in the admin goes through this — TanStack Table for row
 * model + shadcn Table for markup, with the loading/empty/error states and
 * cursor "load more" wired in once instead of per page. */
export function DataTable<TData>({
  columns,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  onRowClick,
  emptyTitle,
  emptyDescription,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: DataTableProps<TData>) {
  const c = useTranslations("common")
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <ListLoadingSkeleton />
  if (isError) return <ListErrorState error={error} onRetry={onRetry} />
  if (data.length === 0) {
    return <ListEmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cellClassName(header.column.id)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              // Banded rows: what lets the eye follow one record across the
              // table to the buttons that act on it.
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  "even:bg-muted/30",
                  onRowClick && "cursor-pointer"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cellClassName(cell.column.id)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {onLoadMore && (
        <div className="flex justify-center py-1">
          {hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? c("loading") : c("loadMore")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {c("allLoaded")}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

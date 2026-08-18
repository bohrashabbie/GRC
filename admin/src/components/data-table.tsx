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
import {
  ListEmptyState,
  ListErrorState,
  ListLoadingSkeleton,
} from "@/components/states/list-states"

const ACTIONS_COLUMN = "actions"
const SPACER_COLUMN = "__spacer"

function spacerColumn<TData>(): ColumnDef<TData, unknown> {
  return { id: SPACER_COLUMN, header: "", cell: () => null }
}

/** Full remaining width for the spacer, and a gap before the buttons so they
 * read as the end of the row rather than as part of the last data column. */
function cellClassName(columnId: string): string | undefined {
  if (columnId === SPACER_COLUMN) return "w-full p-0"
  if (columnId === ACTIONS_COLUMN) return "ps-6"
  return undefined
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
  // A row's buttons belong to that row, so they sit right after its last
  // column instead of being flung to the far edge of the page — a full page
  // width between a name and its Delete button is how staff end up deleting
  // the wrong record. The spacer swallows the leftover width so the real
  // columns, actions included, keep their natural size.
  const hasActions = columns.some((column) => column.id === ACTIONS_COLUMN)
  const laidOut = hasActions ? [...columns, spacerColumn<TData>()] : columns
  const table = useReactTable({
    data,
    columns: laidOut,
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
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
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

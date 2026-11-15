import type { RowData } from '@tanstack/react-table'
import { CustomSelect } from '@rentnerkev/select/select'
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import type { DataTablePaginationProps } from '../Types/dataTable.types.ts'

export function DataTablePagination<TData extends RowData>({
    state,
    handler,
    locale,
    pagination,
    disabled,
    className = '',
}: DataTablePaginationProps<TData>) {
    return (
        <div
            className={`flex flex-col gap-4 border-t border-rentner-border bg-rentner-control/15 px-5 py-4 text-xs text-rentner-muted lg:flex-row lg:items-center lg:justify-between ${className}`}
        >
            <p className="tabular-nums" aria-live="polite">
                {state.messages.rowRange(
                    state.firstRow,
                    state.lastRow,
                    state.totalRows,
                )}
            </p>
            {pagination && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2">
                        <span id={`${state.id}-page-size`}>
                            {state.messages.rowsPerPage}
                        </span>
                        <CustomSelect
                            options={state.pageSizes}
                            value={state.pageSize}
                            onValueChange={handler.handlePageSize}
                            aria-labelledby={`${state.id}-page-size`}
                            controlSize="sm"
                            locale={locale}
                            disabled={disabled}
                            className="min-w-20"
                        />
                    </div>
                    <nav
                        aria-label={state.messages.pageInfo(
                            state.page,
                            state.totalPages,
                        )}
                        className="flex items-center gap-1.5"
                    >
                        <TableButton
                            iconOnly
                            aria-label={state.messages.firstPage}
                            onClick={handler.handleFirstPage}
                            disabled={disabled || !state.canPreviousPage}
                        >
                            <ChevronsLeft
                                aria-hidden="true"
                                className="size-4"
                            />
                        </TableButton>
                        <TableButton
                            iconOnly
                            aria-label={state.messages.previousPage}
                            onClick={handler.handlePreviousPage}
                            disabled={disabled || !state.canPreviousPage}
                        >
                            <ChevronLeft
                                aria-hidden="true"
                                className="size-4"
                            />
                        </TableButton>
                        <span className="min-w-24 px-2 text-center font-medium tabular-nums text-rentner-foreground">
                            {state.messages.pageInfo(
                                state.page,
                                state.totalPages,
                            )}
                        </span>
                        <TableButton
                            iconOnly
                            aria-label={state.messages.nextPage}
                            onClick={handler.handleNextPage}
                            disabled={disabled || !state.canNextPage}
                        >
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4"
                            />
                        </TableButton>
                        <TableButton
                            iconOnly
                            aria-label={state.messages.lastPage}
                            onClick={handler.handleLastPage}
                            disabled={
                                disabled ||
                                state.totalPages === null ||
                                !state.canNextPage
                            }
                        >
                            <ChevronsRight
                                aria-hidden="true"
                                className="size-4"
                            />
                        </TableButton>
                    </nav>
                </div>
            )}
        </div>
    )
}

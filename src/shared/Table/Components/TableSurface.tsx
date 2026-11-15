'use client'

import type { RowData } from '@tanstack/react-table'
import { TableHead } from './TableHead.tsx'
import { TableBody } from './TableBody.tsx'
import { TableStatus } from './TableStatus.tsx'
import type { TableSurfaceProps } from '../Types/dataTable.types.ts'

export function TableSurface<TData extends RowData>({
    table,
    view,
    caption,
    size = 'md',
    striped = false,
    isLoading = false,
    emptyState,
    loadingState,
    noResultsState,
    hasFilters,
    error,
    onRetry,
    onResetFilters,
    containerClassName = '',
    embedded = false,
    stickyHeader,
    classNames,
    rowClassName,
    selection,
    onSelectPage,
    getRowLabel,
    renderExpandedRow,
    detailsId,
    filters,
    detailedStates,
    className = '',
    ref,
    ...tableProps
}: TableSurfaceProps<TData>) {
    return (
        <div
            data-rentner-table-container=""
            className={`relative w-full overflow-auto ${embedded ? '' : 'rounded-rentner-control border border-rentner-border bg-rentner-surface'} ${classNames?.viewport ?? ''} ${containerClassName}`}
        >
            <table
                {...tableProps}
                ref={ref}
                aria-busy={isLoading || tableProps['aria-busy']}
                data-rentner-table=""
                data-size={size}
                data-striped={striped}
                className={`group/table w-full border-collapse text-left text-sm text-rentner-foreground data-[size=sm]:text-xs data-[size=lg]:text-base data-[striped=true]:[&_tbody_tr:nth-child(even)]:bg-rentner-control/25 ${classNames?.table ?? ''} ${className}`}
            >
                {caption != null && (
                    <caption className="border-b border-rentner-border px-4 py-3 text-left font-medium text-rentner-muted">
                        {caption}
                    </caption>
                )}
                <TableHead
                    table={table}
                    view={view}
                    selection={selection}
                    onSelectPage={onSelectPage}
                    renderExpandedRow={renderExpandedRow}
                    isLoading={isLoading}
                    filters={filters}
                    classNames={classNames}
                    stickyHeader={stickyHeader}
                />
                {(error != null && error !== false) ||
                isLoading ||
                view.rows.length === 0 ? (
                    <TableStatus
                        view={view}
                        isLoading={isLoading}
                        loadingState={loadingState}
                        emptyState={emptyState}
                        noResultsState={noResultsState}
                        hasFilters={hasFilters}
                        error={error}
                        onRetry={onRetry}
                        onResetFilters={onResetFilters}
                        detailedStates={detailedStates}
                    />
                ) : (
                    <TableBody
                        table={table}
                        view={view}
                        selection={selection}
                        renderExpandedRow={renderExpandedRow}
                        getRowLabel={getRowLabel}
                        detailsId={detailsId}
                        classNames={classNames}
                        rowClassName={rowClassName}
                        isLoading={isLoading}
                    />
                )}
            </table>
        </div>
    )
}

'use client'

import type { RowData } from '@tanstack/react-table'
import { TableHead } from './TableHead.tsx'
import { TableBody } from './TableBody.tsx'
import { TableStatus } from './TableStatus.tsx'
import type { TableSurfaceProps } from '../Types/dataTable.types.ts'
import { useTableColumnResizeLogic } from '../Hooks/useTableColumnResizeLogic.ts'

export function TableViewport<TData extends RowData>({
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
    filterSummary,
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
    resizableColumns = false,
    reorderableRows = false,
    onRowReorder: _onRowReorder,
    onRowClick,
    onRowDoubleClick,
    onRowContextMenu,
    onCellClick,
    onCellDoubleClick,
    onCellContextMenu,
    ...tableProps
}: TableSurfaceProps<TData>) {
    const {
        state: sizing,
        refs: { table: tableRef },
    } = useTableColumnResizeLogic(
        table,
        resizableColumns,
        Number(reorderableRows) * 48 +
            Number(Boolean(selection?.selectionEnabled)) * 48 +
            Number(Boolean(renderExpandedRow)) * 40,
        ref,
    )
    return (
        <div
            data-rentner-table-container=""
            className={`relative w-full overflow-auto ${embedded ? '' : 'rounded-rentner-control border border-rentner-border bg-rentner-surface'} ${classNames?.viewport ?? ''} ${containerClassName}`}
        >
            <table
                {...tableProps}
                ref={tableRef}
                style={{
                    ...tableProps.style,
                    ...(sizing.fixed
                        ? { tableLayout: 'fixed', width: sizing.width }
                        : {}),
                }}
                aria-busy={isLoading || tableProps['aria-busy']}
                data-rentner-table=""
                data-size={size}
                data-striped={striped}
                className={`group/table w-full border-collapse text-left text-sm text-rentner-foreground data-[size=sm]:text-xs data-[size=lg]:text-base [&_tbody:last-of-type>tr:last-child]:border-b-0 ${sizing.fixed ? '[&_td]:overflow-hidden [&_th]:overflow-visible' : ''} ${classNames?.table ?? ''} ${className}`}
            >
                {caption != null && (
                    <caption className="border-b border-rentner-border px-4 py-3 text-left font-medium text-rentner-muted">
                        {caption}
                    </caption>
                )}
                {sizing.fixed && (
                    <colgroup>
                        {reorderableRows && <col style={{ width: 48 }} />}
                        {selection?.selectionEnabled && (
                            <col style={{ width: 48 }} />
                        )}
                        {renderExpandedRow && <col style={{ width: 40 }} />}
                        {sizing.widths.map((column) => (
                            <col
                                key={column.id}
                                style={{ width: column.width }}
                            />
                        ))}
                    </colgroup>
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
                    resizableColumns={resizableColumns}
                    reorderableRows={reorderableRows}
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
                        filterSummary={filterSummary}
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
                        striped={striped}
                        resizableColumns={resizableColumns}
                        reorderableRows={reorderableRows}
                        onRowClick={onRowClick}
                        onRowDoubleClick={onRowDoubleClick}
                        onRowContextMenu={onRowContextMenu}
                        onCellClick={onCellClick}
                        onCellDoubleClick={onCellDoubleClick}
                        onCellContextMenu={onCellContextMenu}
                    />
                )}
            </table>
        </div>
    )
}

'use client'

import type { RowData } from '@tanstack/react-table'
import { useDataTableLogic } from '../Hooks/useDataTableLogic.ts'
import { DataTableToolbar } from './DataTableToolbar.tsx'
import { DataTablePagination } from './DataTablePagination.tsx'
import { TableColumnFilter } from './TableColumnFilter.tsx'
import { TableSurface } from './TableSurface.tsx'
import { TableProvider } from './TableProvider.tsx'
import type { DataTableProps } from '../Types/dataTable.types.ts'

export function DataTable<TData extends RowData>(props: DataTableProps<TData>) {
    const {
        table,
        state,
        handler,
        refs: { root },
    } = useDataTableLogic(props)
    return (
        <TableProvider portalContainer={state.portalContainer}>
            <section
                ref={root}
                data-rentner-data-table=""
                aria-labelledby={`${state.id}-title`}
                className={`min-w-0 rounded-rentner-control border border-rentner-border bg-rentner-surface text-rentner-foreground ${props.classNames?.root ?? ''} ${props.className ?? ''}`}
            >
                <DataTableToolbar
                    table={table}
                    state={state}
                    handler={handler}
                    options={props}
                    className={props.classNames?.toolbar}
                />
                <TableSurface
                    table={table}
                    view={state}
                    aria-labelledby={`${state.id}-title`}
                    embedded
                    detailedStates
                    size={props.size}
                    striped={props.striped ?? true}
                    stickyHeader={props.stickyHeader}
                    classNames={props.classNames}
                    selection={state}
                    onSelectPage={handler.handleSelectPage}
                    getRowLabel={props.getRowLabel}
                    renderExpandedRow={props.renderExpandedRow}
                    rowClassName={props.rowClassName}
                    detailsId={`${state.id}-details`}
                    isLoading={props.isLoading}
                    emptyState={props.emptyState}
                    loadingState={props.loadingState}
                    noResultsState={props.noResultsState}
                    hasFilters={state.hasFilters}
                    error={props.error}
                    onRetry={props.onRetry}
                    onResetFilters={handler.handleResetFilters}
                    filters={
                        props.columnFilters !== false && state.showFilters ? (
                            <tr id={`${state.id}-filters`}>
                                {state.selectionEnabled && (
                                    <td aria-hidden="true" className="w-12" />
                                )}
                                {props.renderExpandedRow && (
                                    <td aria-hidden="true" className="w-10" />
                                )}
                                {state.filterColumns.map((column) => (
                                    <td
                                        key={column.id}
                                        className="border-t border-rentner-border px-3 py-3"
                                    >
                                        {column.getCanFilter() && (
                                            <TableColumnFilter
                                                column={column}
                                                locale={props.locale ?? 'en'}
                                                messages={state.messages}
                                                disabled={props.isLoading}
                                            />
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ) : null
                    }
                />
                <DataTablePagination
                    state={state}
                    handler={handler}
                    locale={props.locale ?? 'en'}
                    pagination={props.pagination !== false}
                    disabled={props.isLoading}
                    className={props.classNames?.footer}
                />
            </section>
        </TableProvider>
    )
}

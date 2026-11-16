'use client'

import type { RowData } from '@tanstack/react-table'
import { useTableStyles } from '../Hooks/useTableStyles.ts'
import { useDataTableLogic } from '../Hooks/useDataTableLogic.ts'
import { DataTableToolbar } from './DataTableToolbar.tsx'
import { DataTablePagination } from './DataTablePagination.tsx'
import { DataTableFilters } from './DataTableFilters.tsx'
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
    const { state: styles } = useTableStyles(props)
    return (
        <TableProvider
            portalContainer={state.portalContainer}
            classNames={styles.classNames}
            headerDividers={styles.headerDividers}
        >
            <section
                ref={root}
                data-rentner-data-table=""
                aria-labelledby={`${state.id}-title`}
                className={`min-w-0 rounded-rentner-control border border-rentner-border bg-rentner-surface text-rentner-foreground ${styles.classNames.root ?? ''} ${props.className ?? ''}`}
            >
                <DataTableToolbar
                    table={table}
                    state={state}
                    handler={handler}
                    options={props}
                    className={styles.classNames.toolbar}
                />
                {props.columnFilters !== false && state.showFilters && (
                    <DataTableFilters
                        state={state}
                        locale={props.locale ?? 'en'}
                        disabled={props.isLoading}
                        className={styles.classNames.filters}
                    />
                )}
                <TableSurface
                    {...props.tableProps}
                    table={table}
                    view={state}
                    aria-labelledby={`${state.id}-title`}
                    embedded
                    detailedStates
                    resizableColumns={props.resizableColumns}
                    reorderableRows={props.reorderableRows}
                    onRowReorder={handler.handleRowReorder}
                    onRowClick={props.onRowClick}
                    onRowDoubleClick={props.onRowDoubleClick}
                    onRowContextMenu={props.onRowContextMenu}
                    onCellClick={props.onCellClick}
                    onCellDoubleClick={props.onCellDoubleClick}
                    onCellContextMenu={props.onCellContextMenu}
                    size={props.size}
                    striped={props.striped ?? true}
                    stickyHeader={props.stickyHeader}
                    classNames={styles.classNames}
                    headerDividers={styles.headerDividers}
                    expandOnRowClick={props.expandOnRowClick}
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
                    filterSummary={state.filterSummary}
                    error={props.error}
                    onRetry={props.onRetry}
                    onResetFilters={handler.handleResetFilters}
                />
                <DataTablePagination
                    state={state}
                    handler={handler}
                    locale={props.locale ?? 'en'}
                    pagination={props.pagination !== false}
                    disabled={props.isLoading}
                    className={styles.classNames.footer}
                />
            </section>
        </TableProvider>
    )
}

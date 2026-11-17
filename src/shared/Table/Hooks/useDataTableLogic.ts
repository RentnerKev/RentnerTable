'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import type { CellData, Column, RowData, TableFeatures } from '@tanstack/react-table'
import type { MenuItem } from '@rentnerkev/menu'
import { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import {
    getColumnLabel,
    getTableView,
    prepareTableColumns,
} from '../../../lib/Table/presentation.ts'
import { getTableLocale, resolveTableMessages } from '../../../lib/Messages/tableMessages.ts'
import { getTableFilterSummary } from '../../../lib/Table/filterSummary.ts'
import { createTableSearchFilter } from '../../../lib/Table/filters.ts'
import type {
    DataTableLogicOptions,
    DataTableLogicResult,
    TablePageSizeOption,
} from '../Types/dataTable.types.ts'
import { useTableRowOrder } from './useTableRowOrder.ts'
import { useTableStatePersistence } from './useTableStatePersistence.ts'
import { useSingleRowExpansion } from './useSingleRowExpansion.ts'

const defaultPageSizes = [10, 25, 50, 100] as const

function isRowSearchColumn<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData,
>(column: Column<TFeatures, TData, TValue>) {
    // A record-level predicate only needs one eligible accessor as its entry point.
    return column.id === column.table.getAllLeafColumns().find((item) =>
        item.accessorFn &&
        (!('enableGlobalFilter' in item.columnDef) || item.columnDef.enableGlobalFilter !== false),
    )?.id
}

function getPageSizes(options: readonly TablePageSizeOption[], currentSize: number) {
    const labels = new Map([[currentSize, String(currentSize)]])
    for (const option of options) {
        if (typeof option !== 'number') labels.set(option.value, option.label)
        else if (!labels.has(option)) labels.set(option, String(option))
    }
    const sizes = [...labels].toSorted(([a], [b]) => a - b)
    if (sizes.some(([size]) => !Number.isInteger(size) || size < 1))
        throw new Error('Table page sizes must be positive integers')
    return sizes.map(([value, label]) => ({ value, label }))
}

export function useDataTableLogic<TData extends RowData>({
    data,
    columns,
    getRowId,
    locale = 'en',
    messages: overrides,
    rowLabel,
    pagination = true,
    pageSize = 10,
    pageSizeOptions = defaultPageSizes,
    getSearchValues,
    selectable = false,
    renderExpandedRow,
    expansionMode,
    expandedRowId,
    onExpandedRowIdChange,
    showExpandColumn = true,
    initialShowFilters = false,
    tableOptions,
    portalContainer,
    resizableColumns = false,
    reorderableRows = false,
    onRowOrderChange,
    persistence,
    stateRef,
    isLoading = false,
}: DataTableLogicOptions<TData>): DataTableLogicResult<TData> {
    const id = useId()
    const ordered = useTableRowOrder({
        data,
        getRowId,
        reorderableRows,
        onRowOrderChange,
        isLoading,
    })
    const [showFilters, setShowFilters] = useState(initialShowFilters)
    const [root, setRoot] = useState<HTMLElement | null>(null)
    const messages = useMemo(
        () => resolveTableMessages(locale, overrides, rowLabel),
        [locale, overrides, rowLabel],
    )
    const preparedColumns = useMemo(
        () => prepareTableColumns(columns),
        [columns],
    )
    const manualPagination =
        !pagination || tableOptions?.manualPagination === true
    const rowSearchFilter = useMemo(
        () => getSearchValues && createTableSearchFilter(getSearchValues),
        [getSearchValues],
    )
    // TanStack keys its filtered model on data and query state, not filter identity.
    const tableData = useMemo(
        () => rowSearchFilter ? [...ordered.state.data] : ordered.state.data,
        [ordered.state.data, rowSearchFilter],
    )
    const expansion = useSingleRowExpansion({
        expansionMode,
        expandedRowId,
        onExpandedRowIdChange,
        tableOptions,
    })
    const table = useTable({
        globalFilterFn: rowSearchFilter ?? 'text',
        ...(rowSearchFilter && { getColumnCanGlobalFilter: isRowSearchColumn }),
        autoResetPageIndex: false,
        autoResetExpanded: reorderableRows || expansion ? false : undefined,
        columnResizeMode: 'onChange',
        enableColumnResizing: resizableColumns,
        ...tableOptions,
        defaultColumn: resizableColumns
            ? { minSize: 64, maxSize: 2000, ...tableOptions?.defaultColumn }
            : tableOptions?.defaultColumn,
        features: rentnerTableFeatures,
        data: tableData,
        columns: preparedColumns,
        getRowId,
        enableRowSelection: selectable,
        getRowCanExpand:
            tableOptions?.getRowCanExpand ?? (() => Boolean(renderExpandedRow)),
        ...expansion,
        manualPagination,
        initialState: {
            ...tableOptions?.initialState,
            pagination: {
                pageIndex: 0,
                pageSize,
                ...tableOptions?.initialState?.pagination,
            },
        },
    })
    const currentPageSize = table.state.pagination.pageSize
    const preferences = useTableStatePersistence({
        table,
        persistence,
        stateRef,
        showFilters,
        setShowFilters,
        rowOrder: ordered.state.rowOrder,
        restoreRowOrder: ordered.handler.handleRestoreOrder,
    })
    const restoring = preferences.refs.restoring
    const pageIndex = table.state.pagination.pageIndex
    const pageCount = table.getPageCount()
    const setPageIndex = table.setPageIndex
    const firstPage = table.firstPage
    const {
        sorting,
        columnFilters,
        globalFilter,
        pagination: paginationState,
    } = table.atoms
    const resetOnQueryChange = tableOptions?.autoResetPageIndex !== false
    const resetPageIfNeeded = useCallback(() => {
        if (
            !restoring.current &&
            pagination &&
            paginationState.get().pageIndex > 0
        )
            firstPage()
    }, [pagination, paginationState, firstPage, restoring])
    useEffect(() => {
        if (!pagination || !resetOnQueryChange) return
        let previousSorting = sorting.get()
        let previousFilters = columnFilters.get()
        let previousSearch = globalFilter.get()
        const handleQueryChange = () => {
            const nextSorting = sorting.get()
            const nextFilters = columnFilters.get()
            const nextSearch = globalFilter.get()
            const sameSorting =
                previousSorting.length === nextSorting.length &&
                previousSorting.every(
                    (item, index) =>
                        item.id === nextSorting[index]?.id &&
                        item.desc === nextSorting[index]?.desc,
                )
            const sameFilters =
                previousFilters.length === nextFilters.length &&
                previousFilters.every(
                    (item, index) =>
                        item.id === nextFilters[index]?.id &&
                        Object.is(item.value, nextFilters[index]?.value),
                )
            const sameSearch = Object.is(previousSearch, nextSearch)
            previousSorting = nextSorting
            previousFilters = nextFilters
            previousSearch = nextSearch
            // Derived atoms can notify on option updates without a query change.
            if (!sameSorting || !sameFilters || !sameSearch) resetPageIfNeeded()
        }
        const subscriptions = [sorting, columnFilters, globalFilter].map(
            (atom) => atom.subscribe(handleQueryChange),
        )
        return () => {
            for (const subscription of subscriptions) subscription.unsubscribe()
        }
    }, [
        pagination,
        resetOnQueryChange,
        sorting,
        columnFilters,
        globalFilter,
        resetPageIfNeeded,
    ])
    useEffect(() => {
        if (
            preferences.state.status !== 'loading' &&
            !isLoading &&
            !manualPagination &&
            pageIndex > Math.max(0, pageCount - 1)
        )
            setPageIndex(Math.max(0, pageCount - 1))
    }, [
        manualPagination,
        pageCount,
        pageIndex,
        setPageIndex,
        preferences.state.status,
        isLoading,
    ])

    const allColumns = table.getAllLeafColumns()
    const visibleColumns = table.getVisibleLeafColumns()
    const canHideColumns = tableOptions?.enableHiding !== false
    const columnItems = useMemo(
        (): MenuItem[] =>
            allColumns.map((column) => ({
                id: column.id,
                type: 'checkbox',
                label: getColumnLabel(column),
                checked: column.getIsVisible(),
                closeOnSelect: false,
                disabled:
                    !canHideColumns ||
                    !column.getCanHide() ||
                    (column.getIsVisible() && visibleColumns.length === 1),
                onCheckedChange: (checked) => column.toggleVisibility(checked),
            })),
        [allColumns, visibleColumns, canHideColumns],
    )
    const pageSizes = useMemo(
        () => getPageSizes(pageSizeOptions, currentPageSize),
        [pageSizeOptions, currentPageSize],
    )
    const search =
        typeof table.state.globalFilter === 'string'
            ? table.state.globalFilter
            : ''
    const selectionEnabled = selectable !== false
    const selectedRows = selectionEnabled
        ? table.getFilteredSelectedRowModel().rows
        : []
    const view = getTableView(
        table,
        messages,
        Number(selectionEnabled) +
            Number(Boolean(renderExpandedRow) && showExpandColumn) +
            Number(reorderableRows),
    )
    const totalRows = tableOptions?.manualPagination
        ? (tableOptions.rowCount ?? null)
        : table.getRowCount()
    const firstRow =
        view.rows.length > 0
            ? (pagination ? pageIndex * currentPageSize : 0) + 1
            : 0
    const lastRow = view.rows.length > 0 ? firstRow + view.rows.length - 1 : 0
    const handleResetFilters = () => {
        table.setGlobalFilter('')
        table.setColumnFilters([])
        resetPageIfNeeded()
    }
    const handleSearch = (value: string) => {
        const previous = globalFilter.get()
        table.setGlobalFilter(value)
        if (resetOnQueryChange && !Object.is(previous, value))
            resetPageIfNeeded()
    }
    const handlePageSize = (value: number) => {
        table.setPageSize(value)
        resetPageIfNeeded()
    }
    return {
        table,
        state: {
            ...view,
            id,
            search,
            showFilters,
            filterSummary: getTableFilterSummary(
                table,
                search,
                getTableLocale(locale),
                messages,
            ),
            persistenceStatus: preferences.state.status,
            persistenceError: preferences.state.error,
            hasFilters:
                search.trim().length > 0 ||
                table.state.columnFilters.length > 0,
            filterCount: table.state.columnFilters.length,
            filterColumns: visibleColumns,
            columnItems,
            selectedRows,
            selectionCount: selectedRows.length,
            selectionEnabled,
            canSelectPage:
                selectionEnabled && view.rows.some((row) => row.getCanSelect()),
            allPageSelected:
                selectionEnabled && table.getIsAllPageRowsSelected(),
            somePageSelected:
                selectionEnabled && table.getIsSomePageRowsSelected(),
            firstRow,
            lastRow:
                totalRows === null ? lastRow : Math.min(lastRow, totalRows),
            totalRows,
            totalPages: pageCount < 0 ? null : Math.max(1, pageCount),
            page: pageIndex + 1,
            pageSize: currentPageSize,
            pageSizes,
            canPreviousPage: table.getCanPreviousPage(),
            canNextPage: table.getCanNextPage(),
            portalContainer:
                portalContainer === undefined ? root : portalContainer,
        },
        handler: {
            handleSearch,
            handleResetFilters,
            handlePageSize,
            handleToggleFilters: () => setShowFilters((current) => !current),
            handleClearSelection: () => table.resetRowSelection(true),
            handleSelectPage: () =>
                table.toggleAllPageRowsSelected(
                    !table.getIsAllPageRowsSelected(),
                ),
            handleFirstPage: table.firstPage,
            handlePreviousPage: table.previousPage,
            handleNextPage: table.nextPage,
            handleLastPage: table.lastPage,
            handleRowReorder: (activeId, overId) => {
                if (table.state.sorting.length === 0)
                    ordered.handler.handleReorder(activeId, overId)
            },
            handleGetState: preferences.handler.getState,
            handleRestoreState: preferences.handler.restoreState,
            handleFlushState: preferences.handler.flush,
            handleClearStoredState: preferences.handler.clear,
            handleReloadState: preferences.handler.reload,
        },
        refs: { root: setRoot },
    }
}

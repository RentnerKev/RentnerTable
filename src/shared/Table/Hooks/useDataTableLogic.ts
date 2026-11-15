'use client'

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import type { MenuItem } from '@rentnerkev/menu'
import { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import {
    getColumnLabel,
    getTableView,
    prepareTableColumns,
} from '../../../lib/Table/presentation.ts'
import { resolveTableMessages } from '../../../lib/Messages/tableMessages.ts'
import type {
    DataTableLogicOptions,
    DataTableLogicResult,
} from '../Types/dataTable.types.ts'
import { useTableRowOrder } from './useTableRowOrder.ts'

const defaultPageSizes = [10, 25, 50, 100] as const

export function useDataTableLogic<TData extends RowData>({
    data,
    columns,
    getRowId,
    locale = 'en',
    messages: overrides,
    pagination = true,
    pageSize = 10,
    pageSizeOptions = defaultPageSizes,
    selectable = false,
    renderExpandedRow,
    initialShowFilters = false,
    tableOptions,
    portalContainer,
    resizableColumns = false,
    reorderableRows = false,
    onRowOrderChange,
}: DataTableLogicOptions<TData>): DataTableLogicResult<TData> {
    const id = useId()
    const ordered = useTableRowOrder({
        data,
        getRowId,
        reorderableRows,
        onRowOrderChange,
    })
    const [showFilters, setShowFilters] = useState(initialShowFilters)
    const [root, setRoot] = useState<HTMLElement | null>(null)
    const messages = useMemo(
        () => resolveTableMessages(locale, overrides),
        [locale, overrides],
    )
    const preparedColumns = useMemo(
        () => prepareTableColumns(columns),
        [columns],
    )
    const manualPagination =
        !pagination || tableOptions?.manualPagination === true
    const table = useTable({
        globalFilterFn: 'text',
        autoResetPageIndex: false,
        autoResetExpanded: reorderableRows ? false : undefined,
        columnResizeMode: 'onChange',
        enableColumnResizing: resizableColumns,
        ...tableOptions,
        defaultColumn: resizableColumns
            ? { minSize: 64, maxSize: 2000, ...tableOptions?.defaultColumn }
            : tableOptions?.defaultColumn,
        features: rentnerTableFeatures,
        data: ordered.state.data,
        columns: preparedColumns,
        getRowId,
        enableRowSelection: selectable,
        getRowCanExpand:
            tableOptions?.getRowCanExpand ?? (() => Boolean(renderExpandedRow)),
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
        if (pagination && paginationState.get().pageIndex > 0) firstPage()
    }, [pagination, paginationState, firstPage])
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
        if (!manualPagination && pageIndex > Math.max(0, pageCount - 1))
            setPageIndex(Math.max(0, pageCount - 1))
    }, [manualPagination, pageCount, pageIndex, setPageIndex])

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
        () =>
            [...new Set([...pageSizeOptions, currentPageSize])]
                .toSorted((left, right) => left - right)
                .map((value) => ({ value, label: String(value) })),
        [pageSizeOptions, currentPageSize],
    )

    if (
        !Number.isInteger(currentPageSize) ||
        currentPageSize < 1 ||
        pageSizeOptions.some((size) => !Number.isInteger(size) || size < 1)
    )
        throw new Error('Table page sizes must be positive integers')
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
            Number(Boolean(renderExpandedRow)) +
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
        },
        refs: { root: setRoot },
    }
}

'use client'

import { useMemo } from 'react'
import { useTable } from '@tanstack/react-table'
import type { RowData, SortingState } from '@tanstack/react-table'
import { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import { getTableView } from '../../../lib/Table/presentation.ts'
import { resolveTableMessages } from '../../../lib/Messages/tableMessages.ts'
import type {
    TableLogicOptions,
    TableLogicResult,
} from '../Types/table.types.ts'

const defaultResizableColumn = { minSize: 64, maxSize: 2000 }
const emptySorting: SortingState = []

export function useTableLogic<TData extends RowData>({
    data,
    columns,
    getRowId,
    enableSorting = true,
    initialSorting,
    locale = 'en',
    messages,
    resizableColumns = false,
}: TableLogicOptions<TData>): TableLogicResult<TData> {
    const resolvedMessages = useMemo(
        () => resolveTableMessages(locale, messages),
        [locale, messages],
    )
    const table = useTable({
        features: rentnerTableFeatures,
        data,
        columns,
        getRowId,
        enableSorting,
        enableColumnResizing: resizableColumns,
        columnResizeMode: 'onChange',
        defaultColumn: resizableColumns ? defaultResizableColumn : undefined,
        manualPagination: true,
        initialState: { sorting: initialSorting ?? emptySorting },
    })
    return {
        table,
        state: getTableView(table, resolvedMessages),
    }
}

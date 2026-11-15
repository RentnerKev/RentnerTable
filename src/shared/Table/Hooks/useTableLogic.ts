'use client'

import { useTable } from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import { getTableView } from '../../../lib/Table/presentation.ts'
import { resolveTableMessages } from '../../../lib/Messages/tableMessages.ts'
import type {
    TableLogicOptions,
    TableLogicResult,
} from '../Types/table.types.ts'

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
    const table = useTable({
        features: rentnerTableFeatures,
        data,
        columns,
        getRowId,
        enableSorting,
        enableColumnResizing: resizableColumns,
        columnResizeMode: 'onChange',
        defaultColumn: resizableColumns
            ? { minSize: 64, maxSize: 2000 }
            : undefined,
        manualPagination: true,
        initialState: { sorting: initialSorting ?? [] },
    })
    return {
        table,
        state: getTableView(table, resolveTableMessages(locale, messages)),
    }
}

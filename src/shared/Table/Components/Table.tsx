'use client'

import type { RowData } from '@tanstack/react-table'
import { useTableLogic } from '../Hooks/useTableLogic.ts'
import { TableSurface } from './TableSurface.tsx'
import type { TableProps } from '../Types/table.types.ts'

export function Table<TData extends RowData>({
    data,
    columns,
    getRowId,
    enableSorting,
    initialSorting,
    locale,
    messages,
    resizableColumns,
    ...appearance
}: TableProps<TData>) {
    const { table, state } = useTableLogic({
        data,
        columns,
        getRowId,
        enableSorting,
        initialSorting,
        locale,
        messages,
        resizableColumns,
    })
    return (
        <TableSurface
            {...appearance}
            resizableColumns={resizableColumns}
            table={table}
            view={state}
        />
    )
}

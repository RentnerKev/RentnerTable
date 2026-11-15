import { useMemo, useState } from 'react'
import type { RowData } from '@tanstack/react-table'
import {
    applyTableRowOrder,
    moveTableRow,
} from '../../../lib/Table/rowOrder.ts'
import type { DataTableLogicOptions } from '../Types/dataTable.types.ts'

export function useTableRowOrder<TData extends RowData>({
    data,
    getRowId,
    reorderableRows,
    onRowOrderChange,
    isLoading = false,
}: Pick<
    DataTableLogicOptions<TData>,
    'data' | 'getRowId' | 'reorderableRows' | 'onRowOrderChange' | 'isLoading'
>) {
    const [order, setOrder] = useState<string[]>()
    const rows = useMemo(
        () =>
            onRowOrderChange ? data : applyTableRowOrder(data, order, getRowId),
        [data, order, getRowId, onRowOrderChange],
    )
    const rowOrder = useMemo(
        () =>
            !onRowOrderChange && (reorderableRows || order !== undefined)
                ? isLoading && order !== undefined
                    ? order
                    : rows.map(getRowId)
                : undefined,
        [rows, getRowId, onRowOrderChange, reorderableRows, order, isLoading],
    )
    const handleReorder = (activeId: string, overId: string) => {
        if (!reorderableRows) return
        const result = moveTableRow(rows, getRowId, activeId, overId)
        if (!result) return
        if (onRowOrderChange) onRowOrderChange(result.data, result.change)
        else setOrder(result.data.map(getRowId))
    }
    return {
        state: { data: rows, rowOrder },
        handler: {
            handleReorder,
            handleRestoreOrder: (ids: readonly string[]) => {
                if (!onRowOrderChange) setOrder([...ids])
            },
        },
    }
}

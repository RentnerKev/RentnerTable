import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../Types/table.types.ts'
import type { ColumnResizeLogicResult } from '../Types/interaction.types.ts'

export function useTableColumnResizeLogic<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    enabled: boolean,
    extraWidth: number,
    forwardedRef?: Ref<HTMLTableElement>,
): ColumnResizeLogicResult {
    const element = useRef<HTMLTableElement | null>(null)
    useImperativeHandle(forwardedRef, () => {
        if (!element.current)
            throw new Error(
                'The table must be mounted before accessing its ref',
            )
        return element.current
    }, [])
    const [ready, setReady] = useState(false)
    const columns = table.getVisibleLeafColumns()
    useLayoutEffect(() => {
        if (!enabled || ready || !element.current) return
        const measured: Record<string, number> = {}
        for (const row of element.current.tHead?.rows ?? []) {
            for (const header of row.cells) {
                const id = header.dataset.columnId
                const column = id ? table.getColumn(id) : undefined
                if (column && column.columns.length === 0)
                    measured[column.id] =
                        header.getBoundingClientRect().width || column.getSize()
            }
        }
        table.setColumnSizing((current) => ({ ...measured, ...current }))
        setReady(true)
    }, [enabled, ready, table])
    const widths = columns.map((column) => ({
        id: column.id,
        width: column.getSize(),
    }))
    return {
        state: {
            fixed: enabled && ready,
            width: widths.reduce(
                (sum, column) => sum + column.width,
                extraWidth,
            ),
            widths,
        },
        refs: { table: element },
    }
}

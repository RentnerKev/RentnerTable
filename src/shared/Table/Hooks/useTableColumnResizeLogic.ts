import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../Types/table.types.ts'
import type { ColumnResizeLogicResult } from '../Types/interaction.types.ts'
import { fitColumnWidths } from '../../../lib/Table/columnSizing.ts'

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
    const [availableWidth, setAvailableWidth] = useState(
        Number.POSITIVE_INFINITY,
    )
    const columns = table.getVisibleLeafColumns()
    useLayoutEffect(() => {
        if (!enabled) return
        const viewport = element.current?.parentElement
        if (!viewport) return
        const measure = () => {
            if (viewport.clientWidth > 0)
                setAvailableWidth(viewport.clientWidth)
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(viewport)
        return () => observer.disconnect()
    }, [enabled])
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
    const widths = fitColumnWidths(
        columns.map((column) => ({
            id: column.id,
            size: column.getSize(),
            min:
                column.columnDef.minSize ??
                table.options.defaultColumn?.minSize ??
                20,
            max:
                column.columnDef.maxSize ??
                table.options.defaultColumn?.maxSize ??
                Number.MAX_SAFE_INTEGER,
            resizable: column.getCanResize(),
        })),
        availableWidth - extraWidth,
    ).map((column) => ({ id: column.id, width: column.size }))
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

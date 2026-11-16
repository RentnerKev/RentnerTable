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
            const minimum = element.current
                ? element.current.ownerDocument.defaultView?.getComputedStyle(
                      element.current,
                  ).minWidth
                : undefined
            const minimumWidth = minimum?.endsWith('px')
                ? Number.parseFloat(minimum)
                : 0
            if (viewport.clientWidth > 0)
                setAvailableWidth(
                    Math.max(
                        viewport.clientWidth,
                        Number.isFinite(minimumWidth) ? minimumWidth : 0,
                    ),
                )
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(viewport)
        if (element.current) observer.observe(element.current)
        return () => observer.disconnect()
    }, [enabled])
    useLayoutEffect(() => {
        if (!enabled || ready || !element.current) return
        // Configured widths are weights; mounting must not overwrite them or persist a synthetic resize.
        setReady(true)
    }, [enabled, ready])
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
        Object.keys(table.state.columnSizing).length === 0,
    ).map((column) => ({ id: column.id, width: column.size }))
    return {
        state: {
            fixed: enabled && ready,
            availableWidth: Math.max(0, availableWidth - extraWidth),
            width: widths.reduce(
                (sum, column) => sum + column.width,
                extraWidth,
            ),
            widths,
        },
        refs: { table: element },
    }
}

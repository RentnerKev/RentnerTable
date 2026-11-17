import {
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type { Ref } from 'react'
import type { RowData } from '@tanstack/react-table'
import type {
    RentnerTableInstance,
    TableColumnWidthMode,
} from '../Types/table.types.ts'
import type { ColumnResizeLogicResult } from '../Types/interaction.types.ts'
import {
    getTableColumnLayout,
    getTableColumnMinimumWidth,
} from '../../../lib/Table/columnLayout.ts'

export function useTableColumnResizeLogic<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    enabled: boolean,
    extraWidth: number,
    forwardedRef?: Ref<HTMLTableElement>,
    widthMode: TableColumnWidthMode = 'fit',
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
    const [viewportWidth, setViewportWidth] = useState(
        Number.POSITIVE_INFINITY,
    )
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
                setViewportWidth(
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
    const minimum =
        enabled && widthMode === 'scroll' ? getTableColumnMinimumWidth(table) : 0
    const availableWidth = Math.max(minimum, viewportWidth - extraWidth)
    const columns = getTableColumnLayout(table, availableWidth)
    const widths = useMemo(
        () => columns.map((column) => ({ id: column.id, width: column.size })),
        [columns],
    )
    return {
        state: {
            fixed: enabled && ready,
            availableWidth,
            width: widths.reduce(
                (sum, column) => sum + column.width,
                extraWidth,
            ),
            widths,
        },
        refs: { table: element },
    }
}

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import type { KeyboardEvent, MouseEvent, TouchEvent } from 'react'
import type { RowData } from '@tanstack/react-table'
import { getColumnLabel } from '../../../lib/Table/presentation.ts'
import {
    fitColumnWidths,
    getColumnResizeMaximum,
    resizeColumnWidths,
} from '../../../lib/Table/columnSizing.ts'
import type {
    TableColumnResizeHandleProps,
    TableColumnResizeHandleLogicResult,
} from '../Types/interaction.types.ts'

export function useTableResizeHandleLogic<TData extends RowData>({
    table,
    header,
    messages,
    disabled,
}: TableColumnResizeHandleProps<TData>): TableColumnResizeHandleLogicResult {
    const element = useRef<HTMLHRElement | null>(null)
    const cleanup = useRef<(() => void) | null>(null)
    const [availableWidth, setAvailableWidth] = useState(
        Number.POSITIVE_INFINITY,
    )
    const [previewOffset, setPreviewOffset] = useState(0)
    const column = header.column
    const label = getColumnLabel(column)
    const isResizing = column.getIsResizing()
    const direction = table.options.columnResizeDirection === 'rtl' ? -1 : 1
    const getAvailableWidth = useCallback(() => {
        const tableElement = element.current?.closest('table')
        const viewport = tableElement?.parentElement
        if (!viewport || viewport.clientWidth <= 0)
            return Number.POSITIVE_INFINITY
        const utilityCount =
            (tableElement.querySelector('colgroup')?.children.length ?? 0) -
            table.getVisibleLeafColumns().length
        const utilityWidth = Array.from(
            tableElement.querySelector('colgroup')?.children ?? [],
        )
            .slice(0, Math.max(0, utilityCount))
            .reduce(
                (sum, col) =>
                    sum +
                    (col instanceof HTMLElement
                        ? Number.parseFloat(col.style.width) || 0
                        : 0),
                0,
            )
        return Math.max(0, viewport.clientWidth - utilityWidth)
    }, [table])
    useLayoutEffect(() => {
        const measure = () => setAvailableWidth(getAvailableWidth())
        const viewport = element.current?.closest('table')?.parentElement
        if (!viewport || typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(viewport)
        return () => observer.disconnect()
    }, [getAvailableWidth])
    useLayoutEffect(() => {
        const measure = () => setAvailableWidth(getAvailableWidth())
        measure()
    })
    useEffect(() => () => cleanup.current?.(), [])
    const columns = fitColumnWidths(
        table.getVisibleLeafColumns().map((item) => ({
            id: item.id,
            size: item.getSize(),
            min:
                item.columnDef.minSize ??
                table.options.defaultColumn?.minSize ??
                20,
            max:
                item.columnDef.maxSize ??
                table.options.defaultColumn?.maxSize ??
                Number.MAX_SAFE_INTEGER,
            resizable: item.getCanResize(),
        })),
        availableWidth,
    )
    const fitted = columns.find((item) => item.id === column.id)
    const min = fitted?.min ?? column.columnDef.minSize ?? 20
    const max = getColumnResizeMaximum(columns, availableWidth, column.id)
    const size = fitted?.size ?? column.getSize()
    const commit = (requested: number) => {
        const next = resizeColumnWidths(
            columns,
            getAvailableWidth(),
            column.id,
            requested,
        )
        table.setColumnSizing((current) => ({ ...current, ...next }))
    }
    const handleStart = (
        event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>,
    ) => {
        if (
            disabled ||
            !column.getCanResize() ||
            ('button' in event && event.button !== 0)
        )
            return
        if ('touches' in event && event.touches.length !== 1) return
        const clientX =
            'touches' in event ? event.touches[0]?.clientX : event.clientX
        if (clientX === undefined) return
        if ('button' in event) {
            event.preventDefault()
            event.currentTarget.focus()
        }
        event.stopPropagation()
        cleanup.current?.()
        const contextDocument = event.currentTarget.ownerDocument
        const tableElement = event.currentTarget.closest('table')
        const layoutDirection =
            tableElement &&
            contextDocument.defaultView?.getComputedStyle(tableElement)
                .direction === 'rtl'
                ? -1
                : 1
        const startColumns = fitColumnWidths(columns, getAvailableWidth())
        const startSize =
            startColumns.find((item) => item.id === column.id)?.size ?? size
        let latestX = clientX
        const update = (nextX: number, end: boolean) => {
            latestX = nextX
            const next = resizeColumnWidths(
                startColumns,
                getAvailableWidth(),
                column.id,
                startSize + (nextX - clientX) * direction,
            )
            const offset = (next[column.id] ?? startSize) - startSize
            if (table.options.columnResizeMode === 'onEnd') {
                let boundaryOffset = 0
                for (const item of startColumns) {
                    boundaryOffset += (next[item.id] ?? item.size) - item.size
                    if (item.id === column.id) break
                }
                setPreviewOffset(boundaryOffset * layoutDirection)
            }
            table.setColumnResizing((current) => ({
                ...current,
                deltaOffset: offset,
                deltaPercentage: startSize > 0 ? offset / startSize : 0,
            }))
            if (end || table.options.columnResizeMode === 'onChange')
                table.setColumnSizing((current) => ({ ...current, ...next }))
        }
        const finish = (nextX: number, cancel = false) => {
            if (!cancel) update(nextX, true)
            removeListeners()
            setPreviewOffset(0)
            table.resetHeaderSizeInfo(true)
        }
        const mouseMove = (move: globalThis.MouseEvent) =>
            update(move.clientX, false)
        const mouseEnd = (end: globalThis.MouseEvent) => finish(end.clientX)
        const touchMove = (move: globalThis.TouchEvent) => {
            if (move.cancelable) move.preventDefault()
            const touch = move.touches[0]
            if (touch) update(touch.clientX, false)
        }
        const touchEnd = (end: globalThis.TouchEvent) => {
            if (end.cancelable) end.preventDefault()
            finish(end.changedTouches[0]?.clientX ?? latestX)
        }
        const cancel = () => finish(latestX, true)
        const removeListeners = () => {
            contextDocument.removeEventListener('mousemove', mouseMove)
            contextDocument.removeEventListener('mouseup', mouseEnd)
            contextDocument.removeEventListener('touchmove', touchMove)
            contextDocument.removeEventListener('touchend', touchEnd)
            contextDocument.removeEventListener('touchcancel', cancel)
            contextDocument.defaultView?.removeEventListener('blur', cancel)
            cleanup.current = null
        }
        cleanup.current = cancel
        if ('touches' in event) {
            contextDocument.addEventListener('touchmove', touchMove, {
                passive: false,
            })
            contextDocument.addEventListener('touchend', touchEnd, {
                passive: false,
            })
            contextDocument.addEventListener('touchcancel', cancel)
        } else {
            contextDocument.addEventListener('mousemove', mouseMove)
            contextDocument.addEventListener('mouseup', mouseEnd)
        }
        contextDocument.defaultView?.addEventListener('blur', cancel)
        table.setColumnResizing((current) => ({
            ...current,
            startOffset: clientX,
            startSize,
            deltaOffset: 0,
            deltaPercentage: 0,
            columnSizingStart: startColumns.map((item) => [item.id, item.size]),
            isResizingColumn: column.id,
        }))
    }
    const handleReset = () => {
        if (!disabled)
            commit(
                column.columnDef.size ??
                    table.options.defaultColumn?.size ??
                    150,
            )
    }
    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (
            disabled ||
            !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
        )
            return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'Home') {
            handleReset()
            return
        }
        commit(
            event.key === 'End'
                ? max
                : size +
                      (event.key === 'ArrowLeft' ? -1 : 1) *
                          direction *
                          (event.shiftKey ? 50 : 10),
        )
    }
    return {
        state: {
            label: messages.resizeColumn?.(label) ?? `Resize ${label}`,
            resetLabel:
                messages.resetColumnSize?.(label) ?? `Reset width of ${label}`,
            min,
            max,
            size,
            isResizing,
            offset:
                isResizing && table.options.columnResizeMode === 'onEnd'
                    ? previewOffset
                    : 0,
        },
        refs: { element },
        handler: { handleStart, handleReset, handleKeyDown },
    }
}

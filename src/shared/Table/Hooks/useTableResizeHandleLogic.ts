import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, TouchEvent } from 'react'
import type { RowData } from '@tanstack/react-table'
import { getColumnLabel } from '../../../lib/Table/presentation.ts'
import {
    getColumnLayoutResizeBounds,
    getTableColumnLayout,
} from '../../../lib/Table/columnLayout.ts'
import {
    fitColumnWidths,
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
    availableWidth,
}: TableColumnResizeHandleProps<TData>): TableColumnResizeHandleLogicResult {
    const element = useRef<HTMLHRElement | null>(null)
    const cleanup = useRef<(() => void) | null>(null)
    const [previewOffset, setPreviewOffset] = useState(0)
    const availableWidthRef = useRef(availableWidth)
    useLayoutEffect(() => {
        availableWidthRef.current = availableWidth
    }, [availableWidth])
    const column = header.column
    const label = getColumnLabel(column)
    const isResizing = column.getIsResizing()
    const direction = table.options.columnResizeDirection === 'rtl' ? -1 : 1
    useEffect(() => () => cleanup.current?.(), [])
    const columns = getTableColumnLayout(table, availableWidth)
    const bounds = getColumnLayoutResizeBounds(
        columns,
        availableWidth,
        column.id,
    )
    const min = bounds?.column.min ?? column.columnDef.minSize ?? 20
    const max = bounds?.maximum ?? 0
    const size = bounds?.column.size ?? column.getSize()
    const commit = (requested: number) => {
        const next = resizeColumnWidths(
            columns,
            availableWidthRef.current,
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
        const startColumns = fitColumnWidths(
            columns,
            availableWidthRef.current,
            Object.keys(table.state.columnSizing).length === 0,
        )
        const startSize =
            startColumns.find((item) => item.id === column.id)?.size ?? size
        const contextWindow = contextDocument.defaultView
        const mode = table.options.columnResizeMode
        let latestX = clientX
        let frame: number | null = null
        let lastOffset: number | undefined
        let lastWidth: number | undefined
        const update = (nextX: number, end: boolean) => {
            latestX = nextX
            const width = availableWidthRef.current
            const next = resizeColumnWidths(
                startColumns,
                width,
                column.id,
                startSize + (nextX - clientX) * direction,
            )
            const offset = (next[column.id] ?? startSize) - startSize
            const changed = offset !== lastOffset || width !== lastWidth
            if (!changed && !end) return
            lastOffset = offset
            lastWidth = width
            if (changed && mode === 'onEnd') {
                let boundaryOffset = 0
                for (const item of startColumns) {
                    boundaryOffset += (next[item.id] ?? item.size) - item.size
                    if (item.id === column.id) break
                }
                setPreviewOffset(boundaryOffset * layoutDirection)
            }
            if (changed)
                table.setColumnResizing((current) => ({
                    ...current,
                    deltaOffset: offset,
                    deltaPercentage: startSize > 0 ? offset / startSize : 0,
                }))
            if (
                (changed && mode === 'onChange') ||
                (end && mode !== 'onChange')
            )
                table.setColumnSizing((current) => ({ ...current, ...next }))
        }
        // Input devices can emit several moves before a paint. Keep the latest
        // position and commit once per frame without measuring layout on this path.
        const schedule = (nextX: number) => {
            latestX = nextX
            if (frame !== null) return
            if (!contextWindow) {
                update(latestX, false)
                return
            }
            frame = contextWindow.requestAnimationFrame(() => {
                frame = null
                update(latestX, false)
            })
        }
        const finish = (nextX: number, cancel = false) => {
            if (frame !== null) {
                contextWindow?.cancelAnimationFrame(frame)
                frame = null
            }
            // A release may arrive before the queued frame: flush its exact
            // position synchronously so quick drags never lose their final width.
            if (!cancel) update(nextX, true)
            removeListeners()
            setPreviewOffset(0)
            table.resetHeaderSizeInfo(true)
        }
        const mouseMove = (move: globalThis.MouseEvent) =>
            schedule(move.clientX)
        const mouseEnd = (end: globalThis.MouseEvent) => finish(end.clientX)
        const touchMove = (move: globalThis.TouchEvent) => {
            if (move.cancelable) move.preventDefault()
            const touch = move.touches[0]
            if (touch) schedule(touch.clientX)
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

import type { KeyboardEvent, MouseEvent, TouchEvent } from 'react'
import type { RowData } from '@tanstack/react-table'
import { getColumnLabel } from '../../../lib/Table/presentation.ts'
import type { TableColumnResizeHandleProps } from '../Types/interaction.types.ts'

export function useTableResizeHandleLogic<TData extends RowData>({
    table,
    header,
    messages,
    disabled,
}: TableColumnResizeHandleProps<TData>) {
    const column = header.column
    const label = getColumnLabel(column)
    const min = column.columnDef.minSize ?? 20
    const max = column.columnDef.maxSize ?? 2000
    const isResizing = column.getIsResizing()
    const direction = table.options.columnResizeDirection === 'rtl' ? -1 : 1
    const handleStart = (
        event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>,
    ) => {
        if (disabled || ('button' in event && event.button !== 0)) return
        event.stopPropagation()
        header.getResizeHandler(event.currentTarget.ownerDocument)(event)
    }
    const handleReset = () => {
        if (!disabled) column.resetSize()
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
            column.resetSize()
            return
        }
        const size =
            event.key === 'End'
                ? max
                : Math.min(
                      max,
                      Math.max(
                          min,
                          column.getSize() +
                              (event.key === 'ArrowLeft' ? -1 : 1) *
                                  direction *
                                  (event.shiftKey ? 50 : 10),
                      ),
                  )
        table.setColumnSizing((current) => ({ ...current, [column.id]: size }))
    }
    return {
        state: {
            label: messages.resizeColumn?.(label) ?? `Resize ${label}`,
            resetLabel:
                messages.resetColumnSize?.(label) ?? `Reset width of ${label}`,
            min,
            max,
            size: column.getSize(),
            isResizing,
            offset:
                isResizing && table.options.columnResizeMode === 'onEnd'
                    ? (table.state.columnResizing.deltaOffset ?? 0)
                    : 0,
        },
        handler: { handleStart, handleReset, handleKeyDown },
    }
}

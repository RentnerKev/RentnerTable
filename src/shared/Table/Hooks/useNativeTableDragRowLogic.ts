import { useCallback, useContext } from 'react'
import { NativeTableDragContext } from './useNativeTableDragLogic.ts'
import type { NativeTableDragRowLogicResult } from '../Types/nativeDrag.types.ts'

export function useNativeTableDragRowLogic(
    id: string,
    label: string,
): NativeTableDragRowLogicResult {
    const context = useContext(NativeTableDragContext)
    if (!context)
        throw new Error('Native reorder rows require a reorder provider')
    const { controller, activeId, options, instructionsId } = context
    const rowRef = useCallback(
        (element: HTMLTableSectionElement | null) =>
            controller.register(id, element),
        [controller, id],
    )
    return {
        state: {
            dragging: activeId === id,
            style: { opacity: activeId === id ? 0 : undefined },
            disabled: options.disabled,
            reason: options.disabledReason,
            label: options.messages.moveRow?.(label) ?? `Move ${label}`,
            instructionsId,
        },
        refs: { row: rowRef },
        handler: {
            handlePointerDown: (event) => controller.pointer(id, event),
            handleKeyDown: (event) => controller.keyboard(id, event),
        },
    }
}

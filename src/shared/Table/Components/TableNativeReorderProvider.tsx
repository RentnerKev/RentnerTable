import { GripVertical } from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import {
    NativeTableDragContext,
    useNativeTableDragLogic,
} from '../Hooks/useNativeTableDragLogic.ts'
import { useNativeTableDragRowLogic } from '../Hooks/useNativeTableDragRowLogic.ts'
import { TableRowDragContext } from '../Hooks/useTableRowDragContext.ts'
import type {
    TableDragGroupProps,
    TableReorderProviderProps,
} from '../Types/interaction.types.ts'

function NativeRowGroup({ id, label, children }: TableDragGroupProps) {
    const {
        state,
        handler,
        refs: { row: rowRef },
    } = useNativeTableDragRowLogic(id, label)
    return (
        <tbody
            ref={rowRef}
            data-sortable-row={id}
            data-dragging={state.dragging || undefined}
            className="motion-reduce:transition-none!"
            style={state.style}
        >
            {children(
                <TableButton
                    iconOnly
                    data-row-drag-handle=""
                    disabled={state.disabled}
                    aria-disabled={state.disabled}
                    aria-label={state.label}
                    title={state.reason}
                    aria-pressed={state.dragging}
                    aria-roledescription="sortable"
                    aria-describedby={state.instructionsId}
                    onPointerDown={handler.handlePointerDown}
                    onKeyDown={handler.handleKeyDown}
                    className="touch-none cursor-grab border-transparent bg-transparent active:cursor-grabbing"
                >
                    <GripVertical aria-hidden="true" className="size-4" />
                </TableButton>,
            )}
        </tbody>
    )
}

export default function TableNativeReorderProvider(
    props: TableReorderProviderProps,
) {
    const {
        state,
        refs: { preview: previewRef },
    } = useNativeTableDragLogic(props)
    return (
        <NativeTableDragContext value={state.context}>
            <TableRowDragContext value={NativeRowGroup}>
                {props.children}
            </TableRowDragContext>
            <div id={state.instructionsId} className="sr-only">
                {props.messages.dragInstructions ??
                    'Press Space to pick up a row, arrow keys to move, Space or Enter to drop, and Escape to cancel.'}
            </div>
            <output
                id={`DndLiveRegion-${state.instructionsId}`}
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
            >
                {state.display.announcement}
            </output>
            {state.display.preview && (
                <div
                    ref={previewRef}
                    data-rentner-row-preview=""
                    aria-hidden="true"
                    inert
                    className="pointer-events-none fixed z-999 overflow-hidden rounded-lg border border-rentner-accent/60 bg-rentner-surface shadow-2xl"
                    style={{
                        left: state.display.preview.left,
                        top: state.display.preview.top,
                        width: state.display.preview.width,
                        transform: `translate3d(0, ${state.display.preview.offset}px, 0)`,
                    }}
                />
            )}
        </NativeTableDragContext>
    )
}

import { createContext, useContext } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
    restrictToVerticalAxis,
    restrictToFirstScrollableAncestor,
} from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import { useTableDragLogic } from '../Hooks/useTableDragLogic.ts'
import { TableRowDragContext } from '../Hooks/useTableRowDragContext.ts'
import type {
    TableReorderProviderProps,
    TableDragGroupProps,
    TableDragOptions,
} from '../Types/interaction.types.ts'

const DragOptions = createContext<TableDragOptions>({
    disabled: true,
    reason: undefined,
    moveRow: (label: string) => `Move ${label}`,
})
const modifiers = [restrictToFirstScrollableAncestor, restrictToVerticalAxis]

function SortableRowGroup({ id, label, children }: TableDragGroupProps) {
    const options = useContext(DragOptions)
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: options.disabled })
    return (
        <tbody
            ref={setNodeRef}
            data-sortable-row={id}
            data-dragging={isDragging || undefined}
            className="motion-reduce:transition-none!"
            style={{
                transform: isDragging
                    ? undefined
                    : CSS.Transform.toString(transform),
                transition: isDragging ? undefined : transition,
                opacity: isDragging ? 0 : undefined,
            }}
        >
            {children(
                <TableButton
                    {...attributes}
                    {...listeners}
                    ref={setActivatorNodeRef}
                    iconOnly
                    data-row-drag-handle=""
                    disabled={options.disabled}
                    aria-label={options.moveRow(label)}
                    title={options.reason}
                    className="touch-none cursor-grab border-transparent bg-transparent active:cursor-grabbing"
                >
                    <GripVertical aria-hidden="true" className="size-4" />
                </TableButton>,
            )}
        </tbody>
    )
}

export default function TableReorderProvider(props: TableReorderProviderProps) {
    const {
        state,
        handler,
        refs: { preview: previewRef },
    } = useTableDragLogic(props)
    return (
        <DragOptions value={state.dragOptions}>
            <DndContext
                sensors={state.sensors}
                collisionDetection={state.collisionDetection}
                modifiers={modifiers}
                onDragStart={handler.handleStart}
                onDragEnd={handler.handleEnd}
                onDragCancel={handler.handleCancel}
                accessibility={{
                    screenReaderInstructions: {
                        draggable:
                            props.messages.dragInstructions ??
                            'Press Space to pick up a row, arrow keys to move, Space or Enter to drop, and Escape to cancel.',
                    },
                    announcements: state.announcements,
                }}
            >
                <SortableContext
                    items={state.items}
                    strategy={verticalListSortingStrategy}
                >
                    <TableRowDragContext value={SortableRowGroup}>
                        {props.children}
                    </TableRowDragContext>
                </SortableContext>
                <DragOverlay
                    dropAnimation={null}
                    style={
                        state.preview
                            ? {
                                  left: state.preview.left,
                                  width: state.preview.width,
                              }
                            : undefined
                    }
                >
                    {state.preview && (
                        <div
                            ref={previewRef}
                            data-rentner-row-preview=""
                            aria-hidden="true"
                            inert
                            className="pointer-events-none overflow-hidden rounded-lg border border-rentner-accent/60 bg-rentner-surface shadow-2xl"
                        />
                    )}
                </DragOverlay>
            </DndContext>
        </DragOptions>
    )
}

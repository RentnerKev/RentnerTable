import { useCallback, useMemo, useState } from 'react'
import {
    closestCenter,
    pointerWithin,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import type {
    CollisionDetection,
    DragStartEvent,
    DragEndEvent,
    Announcements,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { isTableEventElement } from '../../../lib/Table/events.ts'
import type {
    TableReorderProviderProps,
    TableDragOptions,
    TableRowPreview,
} from '../Types/interaction.types.ts'

const defaultMoveLabel = (label: string) => `Move ${label}`

function snapshotRow(target: EventTarget | null): TableRowPreview | null {
    if (!isTableEventElement(target)) return null
    const source = target.closest<HTMLTableSectionElement>(
        'tbody[data-sortable-row]',
    )
    const table = source?.closest('table')
    if (!source || !table) return null
    const viewport = table.parentElement
    if (!viewport) return null
    const bounds = source.getBoundingClientRect()
    const viewportBounds = viewport.getBoundingClientRect()
    const left = Math.max(
        bounds.left,
        viewportBounds.left + viewport.clientLeft,
    )
    const right = Math.min(
        bounds.right,
        viewportBounds.left + viewport.clientLeft + viewport.clientWidth,
    )
    const preview = table.ownerDocument.createElement('table')
    preview.className = table.className
    preview.dataset.size = table.dataset.size
    preview.dataset.striped = table.dataset.striped
    preview.style.width = `${bounds.width}px`
    preview.style.marginLeft = `${bounds.left - left}px`
    preview.style.tableLayout = 'fixed'
    preview.style.background = 'var(--rentner-surface, #181a1f)'
    const columns = table.ownerDocument.createElement('colgroup')
    for (const cell of source.firstElementChild?.children ?? []) {
        const column = table.ownerDocument.createElement('col')
        column.style.width = `${cell.getBoundingClientRect().width}px`
        columns.appendChild(column)
    }
    const clone = source.ownerDocument.importNode(source, true)
    clone.style.transform = ''
    clone.style.transition = ''
    clone.style.opacity = '1'
    clone.removeAttribute('data-dragging')
    for (const element of [clone, ...clone.querySelectorAll('[id], [name]')]) {
        element.removeAttribute('id')
        element.removeAttribute('name')
    }
    preview.append(columns, clone)
    return { element: preview, left, width: Math.max(0, right - left) }
}

const detectRow: CollisionDetection = (args) =>
    args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)

export function useTableDragLogic({
    rows,
    disabled,
    disabledReason,
    getLabel,
    onReorder,
    messages,
}: TableReorderProviderProps) {
    const dragOptions = useMemo(
        (): TableDragOptions => ({
            disabled,
            reason: disabledReason,
            moveRow: messages.moveRow ?? defaultMoveLabel,
        }),
        [disabled, disabledReason, messages.moveRow],
    )
    const [preview, setPreview] = useState<TableRowPreview | null>(null)
    const items = useMemo(() => rows.map((row) => row.id), [rows])
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 180, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )
    const handleStart = (event: DragStartEvent) => {
        if (!disabled) setPreview(snapshotRow(event.activatorEvent.target))
    }
    const handleEnd = ({ active, over }: DragEndEvent) => {
        setPreview(null)
        if (
            !disabled &&
            typeof active.id === 'string' &&
            typeof over?.id === 'string' &&
            items.includes(active.id) &&
            items.includes(over.id) &&
            active.id !== over.id
        )
            onReorder?.(active.id, over.id)
    }
    const previewRef = useCallback(
        (element: HTMLDivElement | null) => {
            if (element)
                element.replaceChildren(...(preview ? [preview.element] : []))
        },
        [preview],
    )
    const announcements: Announcements = {
        onDragStart: ({ active }) =>
            messages.dragStart?.(getLabel(String(active.id))) ??
            `Moving ${getLabel(String(active.id))}.`,
        onDragOver: ({ active, over }) =>
            over
                ? (messages.dragOver?.(
                      getLabel(String(active.id)),
                      items.indexOf(String(over.id)) + 1,
                      items.length,
                  ) ??
                  `Position ${items.indexOf(String(over.id)) + 1} of ${items.length}.`)
                : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? (messages.dragEnd?.(
                      getLabel(String(active.id)),
                      items.indexOf(String(over.id)) + 1,
                      items.length,
                  ) ??
                  `Moved to position ${items.indexOf(String(over.id)) + 1}.`)
                : (messages.dragCancel?.(getLabel(String(active.id))) ??
                  'Move cancelled.'),
        onDragCancel: ({ active }) =>
            messages.dragCancel?.(getLabel(String(active.id))) ??
            'Move cancelled.',
    }
    return {
        state: {
            items,
            sensors,
            preview,
            announcements,
            collisionDetection: detectRow,
            dragOptions,
        },
        handler: {
            handleStart,
            handleEnd,
            handleCancel: () => setPreview(null),
        },
        refs: { preview: previewRef },
    }
}

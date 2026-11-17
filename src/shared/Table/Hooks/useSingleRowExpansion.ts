import { useMemo, useRef, useState } from 'react'
import type { ExpandedState, RowData, Updater } from '@tanstack/react-table'
import type { DataTableLogicOptions } from '../Types/dataTable.types.ts'

const emptyExpansion: ExpandedState = Object.create(null)

function getExpandedRowId(expanded?: ExpandedState, currentId?: string | null) {
    if (!expanded || expanded === true) return null
    const open = Object.keys(expanded).filter((id) => expanded[id])
    return open.find((id) => id !== currentId) ?? open[0] ?? null
}

function expandedStateFor(rowId: string | null): ExpandedState {
    if (rowId === null) return emptyExpansion
    const expanded: Record<string, boolean> = Object.create(null)
    expanded[rowId] = true
    return expanded
}

export function useSingleRowExpansion<TData extends RowData>({
    expansionMode,
    expandedRowId,
    onExpandedRowIdChange,
    tableOptions,
}: Pick<
    DataTableLogicOptions<TData>,
    'expansionMode' | 'expandedRowId' | 'onExpandedRowIdChange' | 'tableOptions'
>) {
    const [ownRowId, setOwnRowId] = useState(() =>
        getExpandedRowId(tableOptions?.initialState?.expanded),
    )
    const requestedRowId = useRef(ownRowId)
    const controlledExpansion = tableOptions?.state?.expanded
    const controlledRowId = expandedRowId !== undefined
        ? expandedRowId
        : controlledExpansion === undefined
          ? undefined
          : getExpandedRowId(controlledExpansion)
    const rowId = controlledRowId === undefined ? ownRowId : controlledRowId
    const expanded = useMemo(() => expandedStateFor(rowId), [rowId])
    if (
        expansionMode !== 'single' &&
        expandedRowId === undefined &&
        onExpandedRowIdChange === undefined
    ) return undefined

    return {
        state: { ...tableOptions?.state, expanded },
        onExpandedChange: (update: Updater<ExpandedState>) => {
            const currentId = controlledRowId === undefined
                ? requestedRowId.current
                : controlledRowId
            const next = typeof update === 'function'
                ? update(expandedStateFor(currentId))
                : update
            if (next === true) return
            const nextId = getExpandedRowId(next, currentId)
            if (nextId === currentId) return
            if (tableOptions?.onExpandedChange)
                tableOptions.onExpandedChange(expandedStateFor(nextId))
            else if (controlledRowId === undefined) {
                requestedRowId.current = nextId
                setOwnRowId(nextId)
            }
            onExpandedRowIdChange?.(nextId)
        },
    }
}

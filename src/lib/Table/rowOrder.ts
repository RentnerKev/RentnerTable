import type { TableRowOrderChange } from '../../shared/Table/Types/interaction.types.ts'

export function applyTableRowOrder<TData>(
    data: readonly TData[],
    order: readonly string[] | undefined,
    getRowId: (row: TData, index: number) => string,
): readonly TData[] {
    if (!order) return data
    const records = new Map(
        data.map((row, index) => [getRowId(row, index), row]),
    )
    const known = new Set(order)
    const ordered = order
        .filter((id) => records.has(id))
        .map((id) => records.get(id))
    let index = 0
    // New records retain the insertion positions supplied by the application.
    return data.map((row, position) =>
        known.has(getRowId(row, position)) ? (ordered[index++] ?? row) : row,
    )
}

export function moveTableRow<TData>(
    data: readonly TData[],
    getRowId: (row: TData, index: number) => string,
    activeId: string,
    overId: string,
): { data: TData[]; change: TableRowOrderChange } | undefined {
    const ids = data.map(getRowId)
    const fromIndex = ids.indexOf(activeId)
    const toIndex = ids.indexOf(overId)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return undefined
    const result = [...data]
    const [moved] = result.splice(fromIndex, 1)
    if (moved === undefined) return undefined
    result.splice(toIndex, 0, moved)
    return { data: result, change: { activeId, overId, fromIndex, toIndex } }
}

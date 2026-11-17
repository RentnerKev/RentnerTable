import type { TableRowOrderChange } from '../../shared/Table/Types/interaction.types.ts'

export function applyTableRowOrder<TData>(
    data: readonly TData[],
    order: readonly string[] | undefined,
    getRowId: (row: TData, index: number) => string,
): readonly TData[] {
    if (!order) return data
    const records = new Map<string, TData>()
    for (let index = 0; index < data.length; index++)
        records.set(getRowId(data[index], index), data[index])
    const known = new Set(order)
    const ordered: (TData | undefined)[] = []
    for (const id of order) if (records.has(id)) ordered.push(records.get(id))
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
    if (activeId === overId) return undefined
    let fromIndex = -1
    let toIndex = -1
    for (let index = 0; index < data.length; index++) {
        const id = getRowId(data[index], index)
        if (fromIndex < 0 && id === activeId) fromIndex = index
        if (toIndex < 0 && id === overId) toIndex = index
        if (fromIndex >= 0 && toIndex >= 0) break
    }
    if (fromIndex < 0 || toIndex < 0) return undefined
    const result = [...data]
    const [moved] = result.splice(fromIndex, 1)
    if (moved === undefined) return undefined
    result.splice(toIndex, 0, moved)
    return { data: result, change: { activeId, overId, fromIndex, toIndex } }
}

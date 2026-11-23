import type { TableRowOrderChange } from '../../shared/Table/Types/interaction.types.ts'

export function applyTableRowOrder<TData>(
    data: readonly TData[],
    order: readonly string[] | undefined,
    getRowId: (row: TData, index: number) => string,
): readonly TData[] {
    if (!order || data.length === 0) return data
    const len = data.length
    const ids: string[] = []
    const records = new Map<string, TData>()
    for (let index = 0; index < len; index += 1) {
        const row = data[index]!
        const id = getRowId(row, index)
        ids.push(id)
        records.set(id, row)
    }
    const known = new Set(order)
    const ordered: TData[] = []
    for (let i = 0; i < order.length; i += 1) {
        const id = order[i]!
        if (records.has(id)) ordered.push(records.get(id)!)
    }
    let orderedIndex = 0
    const result: TData[] = []
    // New records retain the insertion positions supplied by the application.
    for (let position = 0; position < len; position += 1) {
        result.push(
            known.has(ids[position]!)
                ? (ordered[orderedIndex++] ?? data[position]!)
                : data[position]!,
        )
    }
    return result
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
        const id = getRowId(data[index]!, index)
        if (fromIndex < 0 && id === activeId) fromIndex = index
        if (toIndex < 0 && id === overId) toIndex = index
        if (fromIndex >= 0 && toIndex >= 0) break
    }
    if (fromIndex < 0 || toIndex < 0) return undefined
    const result = [...data]
    const moved = result[fromIndex]
    if (moved === undefined) return undefined
    if (fromIndex < toIndex) {
        for (let i = fromIndex; i < toIndex; i += 1) result[i] = result[i + 1]!
    } else {
        for (let i = fromIndex; i > toIndex; i -= 1) result[i] = result[i - 1]!
    }
    result[toIndex] = moved
    return { data: result, change: { activeId, overId, fromIndex, toIndex } }
}

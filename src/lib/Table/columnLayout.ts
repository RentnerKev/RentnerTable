import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../../shared/Table/Types/table.types.ts'
import { fitColumnWidths } from './columnSizing.ts'
import type { ResizeColumn } from './columnSizing.ts'

interface ColumnLayoutCache {
    inputs: readonly unknown[]
    columns: readonly ResizeColumn[]
}

interface ColumnResizeBounds {
    column: ResizeColumn
    maximum: number
}

interface ColumnResizeBoundsCache {
    availableWidth: number
    byId: ReadonlyMap<string, ColumnResizeBounds>
}

const resizeBounds = new WeakMap<
    readonly ResizeColumn[],
    ColumnResizeBoundsCache
>()

/** Share following-column capacity and ID lookup across all resize handles. */
export function getColumnLayoutResizeBounds(
    columns: readonly ResizeColumn[],
    availableWidth: number,
    id: string,
): ColumnResizeBounds | undefined {
    const cached = resizeBounds.get(columns)
    if (cached && Object.is(cached.availableWidth, availableWidth))
        return cached.byId.get(id)
    const total = columns.reduce((sum, column) => sum + column.size, 0)
    const free = Math.max(0, availableWidth - total)
    const byId = new Map<string, ColumnResizeBounds>()
    let followingCapacity = 0
    for (let index = columns.length - 1; index >= 0; index--) {
        const column = columns[index]
        if (!column) continue
        byId.set(column.id, {
            column,
            maximum: Math.min(
                column.max,
                column.size + free + followingCapacity,
            ),
        })
        if (column.resizable)
            followingCapacity += Math.max(0, column.size - column.min)
    }
    resizeBounds.set(columns, { availableWidth, byId })
    return byId.get(id)
}

// Visible column arrays belong to their table. Weak keys let discarded tables
// and their layouts be collected without keeping a table instance in the cache.
const layouts = new WeakMap<object, ColumnLayoutCache>()

export function getTableColumnLayout<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    availableWidth: number,
): readonly ResizeColumn[] {
    const columns = table.getVisibleLeafColumns()
    const sizing = table.state.columnSizing
    const defaults = table.options.defaultColumn
    const inputs = [
        sizing,
        defaults?.size,
        defaults?.minSize,
        defaults?.maxSize,
        defaults?.enableResizing,
        table.options.enableColumnResizing,
        availableWidth,
    ]
    const cached = layouts.get(columns)
    if (
        cached &&
        inputs.every((input, index) => Object.is(input, cached.inputs[index]))
    )
        return cached.columns
    const configured = columns.map((column) => ({
        id: column.id,
        size: column.getSize(),
        min: column.columnDef.minSize ?? defaults?.minSize ?? 20,
        max:
            column.columnDef.maxSize ??
            defaults?.maxSize ??
            Number.MAX_SAFE_INTEGER,
        resizable: column.getCanResize(),
    }))
    const fitted =
        availableWidth === Number.POSITIVE_INFINITY
            ? configured
            : fitColumnWidths(
                  configured,
                  availableWidth,
                  Object.keys(sizing).length === 0,
              )
    layouts.set(columns, { inputs, columns: fitted })
    return fitted
}

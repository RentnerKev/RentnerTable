import { batch } from '@tanstack/react-store'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../../shared/Table/Types/table.types.ts'
import type {
    TableColumnLayout,
    TableColumnSetting,
} from '../../shared/Table/Types/columnSettings.types.ts'
import { getColumnLabel } from './presentation.ts'

export function readTableColumnLayout<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    initial = false,
): TableColumnLayout {
    const columns = table
        .getAllFlatColumns()
        .filter((column) => !column.columns.length)
    const currentSizing = table.atoms.columnSizing.get()
    const state = initial
        ? table.initialState
        : {
              columnOrder: table.atoms.columnOrder.get(),
              columnVisibility: table.atoms.columnVisibility.get(),
              columnSizing: currentSizing,
          }
    const configuredSizing = state.columnSizing ?? {}
    const known = new Set<string>()
    for (let i = 0; i < columns.length; i += 1) known.add(columns[i]!.id)
    const seen = new Set<string>()
    const order: string[] = []
    const rawOrder = state.columnOrder ?? []
    for (let i = 0; i < rawOrder.length; i += 1) {
        const id = rawOrder[i]!
        if (known.has(id) && !seen.has(id)) {
            seen.add(id)
            order.push(id)
        }
    }
    const columnVisibility: Record<string, boolean> = {}
    const columnSizing: Record<string, number> = {}
    for (let i = 0; i < columns.length; i += 1) {
        const column = columns[i]!
        const id = column.id
        if (!seen.has(id)) order.push(id)
        columnVisibility[id] = column.getCanHide()
            ? state.columnVisibility?.[id] !== false
            : column.getIsVisible()
        const sizing = column.getCanResize() ? configuredSizing : currentSizing
        if (Object.hasOwn(sizing, id)) columnSizing[id] = sizing[id]!
    }
    return {
        columnOrder: order,
        columnVisibility,
        columnSizing,
    }
}

/** Reconcile an isolated draft with current columns and application capabilities. */
export function getTableColumnSettings<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    draft: TableColumnLayout,
): TableColumnSetting[] {
    const columns = new Map(
        table.getAllLeafColumns().map((column) => [column.id, column]),
    )
    const defaults = table.options.defaultColumn
    const ids = [...new Set([...draft.columnOrder, ...columns.keys()])]
    return ids.flatMap((id) => {
        const column = columns.get(id)
        if (!column) return []
        const canHide = column.getCanHide()
        const canResize = column.getCanResize()
        const min = column.columnDef.minSize ?? defaults?.minSize ?? 20
        const max =
            column.columnDef.maxSize ??
            defaults?.maxSize ??
            Number.MAX_SAFE_INTEGER
        const configuredWidth = Math.min(
            max,
            Math.max(min, column.columnDef.size ?? defaults?.size ?? 150),
        )
        const width = Object.hasOwn(draft.columnSizing, id)
            ? draft.columnSizing[id]
            : configuredWidth
        return [
            {
                id,
                label: getColumnLabel(column),
                visible:
                    canHide && Object.hasOwn(draft.columnVisibility, id)
                        ? draft.columnVisibility[id] !== false
                        : column.getIsVisible(),
                width: canResize ? width : column.getSize(),
                min,
                max,
                canHide,
                canResize,
            },
        ]
    })
}

export function isTableColumnLayoutValid(rows: readonly TableColumnSetting[]) {
    return (
        rows.some((row) => row.visible) &&
        rows.every(
            (row) =>
                !row.canResize ||
                (Number.isFinite(row.width) &&
                    row.width >= row.min &&
                    row.width <= row.max),
        )
    )
}

export function applyTableColumnLayout<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    draft: TableColumnLayout,
) {
    const rows = getTableColumnSettings(table, draft)
    if (!isTableColumnLayoutValid(rows)) return false
    const sizing = table.atoms.columnSizing.get()
    batch(() => {
        table.setColumnOrder(rows.map((row) => row.id))
        table.setColumnVisibility(
            Object.fromEntries(rows.map((row) => [row.id, row.visible])),
        )
        table.setColumnSizing(
            Object.fromEntries(
                rows.flatMap((row) => {
                    const source = row.canResize ? draft.columnSizing : sizing
                    // Missing entries keep configured sizing automatic after Apply.
                    return Object.hasOwn(source, row.id)
                        ? [[row.id, source[row.id]]]
                        : []
                }),
            ),
        )
    })
    return true
}

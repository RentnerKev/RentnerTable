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
    const columns = table.getAllFlatColumns().filter((column) => !column.columns.length)
    const state = initial ? table.initialState : {
        columnOrder: table.atoms.columnOrder.get(),
        columnVisibility: table.atoms.columnVisibility.get(),
        columnSizing: table.atoms.columnSizing.get(),
    }
    const known = new Set(columns.map((column) => column.id))
    const order = [...new Set((state.columnOrder ?? []).filter((id) => known.has(id)))]
    for (const column of columns) if (!order.includes(column.id)) order.push(column.id)
    return {
        columnOrder: order,
        columnVisibility: Object.fromEntries(columns.map((column) => [
            column.id,
            column.getCanHide()
                ? state.columnVisibility?.[column.id] !== false
                : column.getIsVisible(),
        ])),
        columnSizing: Object.fromEntries(columns.flatMap((column) => {
            const value = column.getCanResize()
                ? (state.columnSizing?.[column.id] ?? (initial
                    ? Math.min(column.columnDef.maxSize ?? table.options.defaultColumn?.maxSize ?? Number.MAX_SAFE_INTEGER,
                        Math.max(column.columnDef.minSize ?? table.options.defaultColumn?.minSize ?? 20,
                            column.columnDef.size ?? table.options.defaultColumn?.size ?? 150))
                    : undefined))
                : table.atoms.columnSizing.get()[column.id]
            return value === undefined ? [] : [[column.id, value]]
        })),
    }
}

/** Reconcile an isolated draft with current columns and application capabilities. */
export function getTableColumnSettings<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    draft: TableColumnLayout,
): TableColumnSetting[] {
    const columns = new Map(table.getAllLeafColumns().map((column) => [column.id, column]))
    const ids = [...new Set([...draft.columnOrder, ...columns.keys()])]
    return ids.flatMap((id) => {
        const column = columns.get(id)
        if (!column) return []
        const canHide = column.getCanHide()
        const canResize = column.getCanResize()
        return [{
            id,
            label: getColumnLabel(column),
            visible: canHide && Object.hasOwn(draft.columnVisibility, id)
                ? draft.columnVisibility[id] !== false
                : column.getIsVisible(),
            width: canResize && Object.hasOwn(draft.columnSizing, id)
                ? draft.columnSizing[id]
                : column.getSize(),
            min: column.columnDef.minSize ?? table.options.defaultColumn?.minSize ?? 20,
            max: column.columnDef.maxSize ?? table.options.defaultColumn?.maxSize ?? Number.MAX_SAFE_INTEGER,
            canHide,
            canResize,
        }]
    })
}

export function isTableColumnLayoutValid(rows: readonly TableColumnSetting[]) {
    return rows.some((row) => row.visible) && rows.every((row) =>
        !row.canResize || (Number.isFinite(row.width) && row.width >= row.min && row.width <= row.max),
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
        table.setColumnVisibility(Object.fromEntries(rows.map((row) => [row.id, row.visible])))
        table.setColumnSizing(Object.fromEntries(rows.flatMap((row) => {
            if (row.canResize) return [[row.id, row.width]]
            return Object.hasOwn(sizing, row.id) ? [[row.id, sizing[row.id]]] : []
        })))
    })
    return true
}

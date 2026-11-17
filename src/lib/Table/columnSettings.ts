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
    const known = new Set(columns.map((column) => column.id))
    const order = [
        ...new Set((state.columnOrder ?? []).filter((id) => known.has(id))),
    ]
    for (const column of columns)
        if (!order.includes(column.id)) order.push(column.id)
    return {
        columnOrder: order,
        columnVisibility: Object.fromEntries(
            columns.map((column) => [
                column.id,
                column.getCanHide()
                    ? state.columnVisibility?.[column.id] !== false
                    : column.getIsVisible(),
            ]),
        ),
        columnSizing: Object.fromEntries(
            columns.flatMap((column) => {
                const sizing = column.getCanResize()
                    ? configuredSizing
                    : currentSizing
                return Object.hasOwn(sizing, column.id)
                    ? [[column.id, sizing[column.id]]]
                    : []
            }),
        ),
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

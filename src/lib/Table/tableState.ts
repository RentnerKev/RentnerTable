import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../../shared/Table/Types/table.types.ts'
import type { TableStateSnapshot } from '../../shared/Table/Types/persistence.types.ts'

/** Ignore obsolete columns and honor the current application's column capabilities. */
export function restoreTableState<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    { state }: TableStateSnapshot,
) {
    const columns = new Map(
        table.getAllLeafColumns().map((column) => [column.id, column]),
    )
    if (state.sorting !== undefined)
        table.setSorting(
            state.sorting.filter((item) => columns.get(item.id)?.getCanSort()),
        )
    if (state.columnFilters !== undefined)
        table.setColumnFilters(
            state.columnFilters.filter((item) =>
                columns.get(item.id)?.getCanFilter(),
            ),
        )
    if (state.globalFilter !== undefined)
        table.setGlobalFilter(state.globalFilter)
    if (state.columnVisibility !== undefined) {
        const visibility = Object.fromEntries(
            Object.entries(state.columnVisibility).filter(([id, visible]) => {
                const column = columns.get(id)
                return column && (visible || column.getCanHide())
            }),
        )
        if ([...columns.keys()].every((id) => visibility[id] === false)) {
            const first = columns.keys().next().value
            if (first !== undefined) visibility[first] = true
        }
        table.setColumnVisibility(visibility)
    }
    if (state.columnSizing !== undefined)
        table.setColumnSizing(
            Object.fromEntries(
                Object.entries(state.columnSizing).flatMap(([id, value]) => {
                    const column = columns.get(id)
                    if (!column) return []
                    const min =
                        column.columnDef.minSize ??
                        table.options.defaultColumn?.minSize ??
                        20
                    const max =
                        column.columnDef.maxSize ??
                        table.options.defaultColumn?.maxSize ??
                        Number.MAX_SAFE_INTEGER
                    return [[id, Math.min(max, Math.max(min, value))]]
                }),
            ),
        )
    if (state.rowSelection !== undefined)
        table.setRowSelection(
            Object.fromEntries(
                Object.entries(state.rowSelection).flatMap(([id, selected]) =>
                    selected ? [[id, true as const]] : [],
                ),
            ),
        )
    if (state.expanded !== undefined) table.setExpanded(state.expanded)
    // Apply pagination after query setters so restoring filters cannot reset the saved page.
    if (state.pagination !== undefined) table.setPagination(state.pagination)
}

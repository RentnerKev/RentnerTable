import { batch } from '@tanstack/react-store'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from '../../shared/Table/Types/table.types.ts'
import type { TableStateSnapshot } from '../../shared/Table/Types/persistence.types.ts'

/** Ignore obsolete columns and honor the current application's column capabilities. */
export function restoreTableState<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    { state }: TableStateSnapshot,
) {
    const leafColumns = table.getAllLeafColumns()
    const columns = new Map<string, (typeof leafColumns)[number]>()
    for (let i = 0; i < leafColumns.length; i += 1) {
        const col = leafColumns[i]!
        columns.set(col.id, col)
    }
    batch(() => {
        if (state.columnOrder !== undefined) {
            table.setColumnOrder(
                state.columnOrder.filter((id) => columns.has(id)),
            )
        }
        if (state.sorting !== undefined)
            table.setSorting(
                state.sorting.filter((item) =>
                    columns.get(item.id)?.getCanSort(),
                ),
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
            const visibility: Record<string, boolean> = {}
            for (const [id, visible] of Object.entries(
                state.columnVisibility,
            )) {
                const column = columns.get(id)
                if (column && (visible || column.getCanHide())) {
                    visibility[id] = visible
                }
            }
            let anyVisible = false
            for (const id of columns.keys()) {
                if (visibility[id] !== false) {
                    anyVisible = true
                    break
                }
            }
            if (!anyVisible && leafColumns.length > 0) {
                visibility[leafColumns[0]!.id] = true
            }
            table.setColumnVisibility(visibility)
        }
        if (state.columnSizing !== undefined) {
            const sizing: Record<string, number> = {}
            const defaultMin = table.options.defaultColumn?.minSize ?? 20
            const defaultMax =
                table.options.defaultColumn?.maxSize ?? Number.MAX_SAFE_INTEGER
            for (const [id, value] of Object.entries(state.columnSizing)) {
                const column = columns.get(id)
                if (!column) continue
                const min = column.columnDef.minSize ?? defaultMin
                const max = column.columnDef.maxSize ?? defaultMax
                sizing[id] = Math.min(max, Math.max(min, value))
            }
            table.setColumnSizing(sizing)
        }
        if (state.rowSelection !== undefined) {
            const selection: Record<string, true> = {}
            for (const [id, selected] of Object.entries(state.rowSelection)) {
                if (selected) selection[id] = true
            }
            table.setRowSelection(selection)
        }
        if (state.expanded !== undefined) table.setExpanded(state.expanded)
        // Apply pagination after query setters so restoring filters cannot reset the saved page.
        if (state.pagination !== undefined)
            table.setPagination(state.pagination)
    })
}

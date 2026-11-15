import type { RowData } from '@tanstack/react-table'
import type {
    RentnerTableInstance,
    TableColumn,
    TableHeaderState,
    TableLogicResult,
    TableMessages,
} from '../../shared/Table/Types/table.types.ts'
import type { TableColumnInstance } from '../../shared/Table/Types/dataTable.types.ts'

export function getColumnLabel<TData extends RowData>(
    column: TableColumnInstance<TData>,
): string {
    return (
        column.columnDef.meta?.label ??
        (typeof column.columnDef.header === 'string'
            ? column.columnDef.header
            : column.id)
    )
}

export function prepareTableColumns<TData extends RowData>(
    columns: readonly TableColumn<TData>[],
): TableColumn<TData>[] {
    return columns.map((column) => {
        const kind = column.meta?.filter?.type
        let filterFn: 'text' | 'equals' | 'dateRange' = 'text'
        if (kind === 'select') filterFn = 'equals'
        if (kind === 'dateRange') filterFn = 'dateRange'
        return {
            ...column,
            filterFn: column.filterFn ?? filterFn,
            ...('columns' in column && column.columns
                ? { columns: prepareTableColumns(column.columns) }
                : {}),
        }
    })
}

export function getTableView<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    messages: TableMessages,
    extraColumns = 0,
): TableLogicResult<TData>['state'] {
    return {
        headerGroups: table.getHeaderGroups().map((group) => ({
            id: group.id,
            headers: group.headers.map((header): TableHeaderState<TData> => {
                const sorted = header.column.getIsSorted()
                const next = header.column.getNextSortingOrder()
                let sortDirection: TableHeaderState<TData>['sortDirection']
                let sortIndicator = '↕'
                let sortAction = messages.clearSorting
                if (sorted === 'asc') {
                    sortDirection = 'ascending'
                    sortIndicator = '↑'
                }
                if (sorted === 'desc') {
                    sortDirection = 'descending'
                    sortIndicator = '↓'
                }
                if (next === 'asc') sortAction = messages.sortAscending
                if (next === 'desc') sortAction = messages.sortDescending
                return {
                    header,
                    canSort:
                        !header.isPlaceholder && header.column.getCanSort(),
                    sortDirection:
                        !header.isPlaceholder &&
                        header.column.getSortIndex() === 0
                            ? sortDirection
                            : undefined,
                    sortAction,
                    sortIndicator,
                }
            }),
        })),
        rows: table.getRowModel().rows,
        columnCount: Math.max(
            1,
            table.getVisibleLeafColumns().length + extraColumns,
        ),
        messages,
    }
}

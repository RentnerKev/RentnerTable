import type { RowData } from '@tanstack/react-table'
import type {
    RentnerTableInstance,
    TableColumn,
    TableHeaderState,
    TableLogicResult,
    TableMessages,
} from '../../shared/Table/Types/table.types.ts'
import type { TableColumnInstance } from '../../shared/Table/Types/dataTable.types.ts'

const selectOptionsCache = /* @__PURE__ */ new WeakMap<
    object,
    { model: object; options: readonly { value: string; label: string }[] }
>()

export function getTableSelectOptions<TData extends RowData>(
    column: TableColumnInstance<TData>,
): readonly { value: string; label: string }[] {
    const config = column.columnDef.meta?.filter
    if (config?.type !== 'select') return []
    if (config.options) return config.options

    const model = column.table.getPreFilteredRowModel()
    const cached = selectOptionsCache.get(column)
    if (cached?.model === model) return cached.options

    const values = new Set<string>()
    const addValue = (value: unknown) => {
        if (typeof value === 'string' && value !== '') values.add(value)
    }
    for (const row of model.flatRows) {
        const value = row.getValue(column.id)
        if (config.match === 'includes') {
            if (Array.isArray(value)) value.forEach(addValue)
        } else {
            addValue(value)
        }
    }

    const options = [...values]
        .toSorted()
        .map((value) => ({ value, label: value }))
    selectOptionsCache.set(column, { model, options })
    return options
}

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
        const filter = column.meta?.filter
        let filterFn: 'text' | 'equals' | 'includes' | 'dateRange' = 'text'
        if (filter?.type === 'select') filterFn = filter.match ?? 'equals'
        if (filter?.type === 'dateRange') filterFn = 'dateRange'
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

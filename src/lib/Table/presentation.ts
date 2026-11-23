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
    const flatRows = model.flatRows
    const colId = column.id
    if (config.match === 'includes') {
        for (let i = 0; i < flatRows.length; i += 1) {
            const value = flatRows[i]!.getValue(colId)
            if (!Array.isArray(value)) continue
            for (let j = 0; j < value.length; j += 1) {
                const item = value[j]
                if (typeof item === 'string' && item !== '') values.add(item)
            }
        }
    } else {
        for (let i = 0; i < flatRows.length; i += 1) {
            const value = flatRows[i]!.getValue(colId)
            if (typeof value === 'string' && value !== '') values.add(value)
        }
    }

    const sorted = [...values]
    sorted.sort()
    const options = sorted.map((value) => ({ value, label: value }))
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

import type { ComponentPropsWithRef, ReactNode } from 'react'
import type {
    ColumnDef,
    Header,
    ReactTable,
    Row,
    RowData,
    SortingState,
    TableOptions,
} from '@tanstack/react-table'
import type { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import type {
    TableInteractionMessages,
    TableRowEvents,
} from './interaction.types.ts'

export type TableLocale = 'de' | 'en'
export type TableSize = 'sm' | 'md' | 'lg'

export interface TableMessages extends Partial<TableInteractionMessages> {
    empty: string
    loading: string
    sortAscending: string
    sortDescending: string
    clearSorting: string
    title: string
    search: string
    searchPlaceholder: string
    filters: string
    columns: string
    resetFilters: string
    noResults: string
    noResultsDescription: string
    emptyDescription: string
    error: string
    retry: string
    all: string
    filterColumn: (label: string) => string
    rowsPerPage: string
    firstPage: string
    previousPage: string
    nextPage: string
    lastPage: string
    pageInfo: (page: number, pages: number | null) => string
    rowRange: (first: number, last: number, total: number | null) => string
    results: (count: number) => string
    selected: (count: number) => string
    clearSelection: string
    selectPage: string
    selectRow: (label: string) => string
    expandRow: (label: string) => string
    collapseRow: (label: string) => string
}

export type TableColumn<TData extends RowData, TValue = unknown> = ColumnDef<
    typeof rentnerTableFeatures,
    TData,
    TValue
>

export type RentnerTableInstance<TData extends RowData> = ReactTable<
    typeof rentnerTableFeatures,
    TData
>
export type RentnerTableOptions<TData extends RowData> = Omit<
    TableOptions<typeof rentnerTableFeatures, TData>,
    'features'
>

export type TableLogicOptions<TData extends RowData> = Pick<
    TableOptions<typeof rentnerTableFeatures, TData>,
    'data' | 'columns' | 'getRowId' | 'enableSorting'
> & {
    initialSorting?: SortingState
    locale?: TableLocale
    messages?: Partial<TableMessages>
    /** Enable horizontal drag handles and keyboard column resizing. Defaults to false. */
    resizableColumns?: boolean
}

export type TableProps<TData extends RowData> = Omit<
    ComponentPropsWithRef<'table'>,
    'children'
> &
    TableLogicOptions<TData> &
    TableRowEvents<TData> & {
        children?: never
        caption?: ReactNode
        size?: TableSize
        striped?: boolean
        isLoading?: boolean
        emptyState?: ReactNode
        loadingState?: ReactNode
        containerClassName?: string
    }

export interface TableHeaderState<TData extends RowData> {
    header: Header<typeof rentnerTableFeatures, TData, unknown>
    canSort: boolean
    sortDirection: 'ascending' | 'descending' | undefined
    sortAction: string
    sortIndicator: string
}

export interface TableLogicResult<TData extends RowData> {
    table: ReactTable<typeof rentnerTableFeatures, TData>
    state: {
        headerGroups: {
            id: string
            headers: TableHeaderState<TData>[]
        }[]
        rows: Row<typeof rentnerTableFeatures, TData>[]
        columnCount: number
        messages: TableMessages
    }
}

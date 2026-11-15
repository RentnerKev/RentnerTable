import {
    createColumnHelper,
    columnFilteringFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    createExpandedRowModel,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    globalFilteringFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFns,
    tableFeatures,
} from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import type { TableColumnMeta } from '../../shared/Table/Types/column.types.ts'
import {
    tableDateRangeFilter,
    tableEqualsFilter,
    tableTextFilter,
} from './filters.ts'

const columnMeta: TableColumnMeta = {}

export const rentnerTableFeatures = tableFeatures({
    columnMeta,
    columnSizingFeature,
    columnVisibilityFeature,
    columnFilteringFeature,
    globalFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    filterFns: {
        text: tableTextFilter,
        equals: tableEqualsFilter,
        dateRange: tableDateRangeFilter,
    },
    rowPaginationFeature,
    paginatedRowModel: createPaginatedRowModel(),
    rowSelectionFeature,
    rowExpandingFeature,
    expandedRowModel: createExpandedRowModel(),
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns,
})

export function createTableColumnHelper<TData extends RowData>() {
    return createColumnHelper<typeof rentnerTableFeatures, TData>()
}

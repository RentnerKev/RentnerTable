import {
    createColumnHelper,
    columnFilteringFeature,
    columnOrderingFeature,
    columnSizingFeature,
    columnResizingFeature,
    columnVisibilityFeature,
    createExpandedRowModel,
    createFilteredRowModel,
    createPaginatedRowModel,
    sortFns,
    globalFilteringFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table'
import type { RowData } from '@tanstack/react-table'
import type { TableColumnMeta } from '../../shared/Table/Types/column.types.ts'
import {
    tableDateRangeFilter,
    tableEqualsFilter,
    tableTextFilter,
} from './filters.ts'

import { createMaterializedSortedRowModel } from './sortedRowModel.ts'

const columnMeta: TableColumnMeta = {}

export const rentnerTableFeatures = tableFeatures({
    columnMeta,
    columnOrderingFeature,
    columnSizingFeature,
    columnResizingFeature,
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
    sortedRowModel: createMaterializedSortedRowModel(),
    sortFns,
})

export function createTableColumnHelper<TData extends RowData>() {
    return createColumnHelper<typeof rentnerTableFeatures, TData>()
}

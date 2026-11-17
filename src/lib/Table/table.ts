import {
    createColumnHelper,
    columnFilteringFeature,
    columnOrderingFeature,
    columnSizingFeature,
    columnResizingFeature,
    columnVisibilityFeature,
    createExpandedRowModel,
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
import { createCoordinatedFilteredRowModels } from './filteredRowModel.ts'

const columnMeta: TableColumnMeta = {}

function createRentnerTableFeatures() {
    const coordinated = createCoordinatedFilteredRowModels()
    return tableFeatures({
        columnMeta,
        columnOrderingFeature,
        columnSizingFeature,
        columnResizingFeature,
        columnVisibilityFeature,
        columnFilteringFeature,
        globalFilteringFeature,
        coreRowModel: coordinated.coreRowModel,
        filteredRowModel: coordinated.filteredRowModel,
        filterFns: {
            text: tableTextFilter,
            equals: tableEqualsFilter,
            dateRange: tableDateRangeFilter,
        },
        rowPaginationFeature,
        paginatedRowModel: /* @__PURE__ */ createPaginatedRowModel(),
        rowSelectionFeature,
        rowExpandingFeature,
        expandedRowModel: /* @__PURE__ */ createExpandedRowModel(),
        rowSortingFeature,
        sortedRowModel: /* @__PURE__ */ createMaterializedSortedRowModel(),
        sortFns,
    })
}

export const rentnerTableFeatures = /* @__PURE__ */ createRentnerTableFeatures()

export function createTableColumnHelper<TData extends RowData>() {
    return createColumnHelper<typeof rentnerTableFeatures, TData>()
}

'use client'

import { lazy, Suspense } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { TableSurfaceProps } from '../Types/dataTable.types.ts'
import { TableViewport } from './TableViewport.tsx'

const ReorderableTable = /* @__PURE__ */ lazy(() =>
    import('./TableNativeReorderProvider.tsx'),
)

export function TableSurface<TData extends RowData>(
    props: TableSurfaceProps<TData>,
) {
    return props.reorderableRows ? (
        <Suspense fallback={<TableViewport {...props} />}>
            <ReorderableTable
                rows={props.view.rows}
                messages={props.view.messages}
                disabled={Boolean(
                    props.isLoading ||
                    (props.error != null && props.error !== false) ||
                    props.table.state.sorting.length ||
                    !props.onRowReorder,
                )}
                disabledReason={
                    props.table.state.sorting.length
                        ? props.view.messages.rowSortingActive
                        : undefined
                }
                getLabel={(id) => {
                    const row = props.view.rows.find((item) => item.id === id)
                    return row
                        ? (props.getRowLabel?.(row.original) ?? row.id)
                        : id
                }}
                onReorder={props.onRowReorder}
            >
                <TableViewport {...props} />
            </ReorderableTable>
        </Suspense>
    ) : (
        <TableViewport {...props} />
    )
}

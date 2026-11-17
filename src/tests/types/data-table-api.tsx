import { DataTable, createTableColumnHelper } from '../../index.ts'
import { createRef } from 'react'
import type {
    DataTableProps,
    TableColumn,
    TableDateRange,
    TableStateController,
    TableStateSnapshot,
    TableStateStorage,
} from '../../types.ts'

interface Member {
    id: string
    name: string
    active: boolean
    joined: string
}
const helper = createTableColumnHelper<Member>()
const data: readonly Member[] = [
    { id: 'one', name: 'Alex', active: false, joined: '2026-11-15' },
]
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        meta: { filter: { type: 'text' }, align: 'left' },
        cell: ({ getValue }) => getValue().toUpperCase(),
    }),
    helper.accessor('joined', {
        header: 'Joined',
        meta: { filter: { type: 'dateRange' } },
    }),
])

export const range: TableDateRange = { from: '2026-11-01', to: '2026-11-15' }
export const props: DataTableProps<Member> = {
    data,
    columns,
    getRowId: (row) => row.id,
    selectable: (row) => !row.original.active,
    tableOptions: {
        manualPagination: true,
        rowCount: 100,
        state: { pagination: { pageIndex: 0, pageSize: 10 } },
    },
    bulkActions: ({ selectedRows }) =>
        selectedRows.map((row) => row.original.name).join(', '),
    renderExpandedRow: (row) => row.original.joined,
    resizableColumns: true,
    columnSettings: true,
    messages: {
        columnSettings: { title: 'Choose a layout', apply: 'Save columns' },
    },
    reorderableRows: true,
    onRowOrderChange: (rows, change) => {
        rows[change.toIndex]?.active satisfies boolean | undefined
        change.activeId satisfies string
    },
    onRowClick: (row, event) => {
        row.original.name satisfies string
        event.currentTarget satisfies HTMLTableRowElement
    },
    onCellContextMenu: (cell, event) => {
        cell.row.original.active satisfies boolean
        cell.column.id satisfies string
        event.currentTarget satisfies HTMLTableCellElement
        event.preventDefault()
    },
    tableProps: {
        onContextMenu: (event) =>
            event.currentTarget satisfies HTMLTableElement,
    },
}
export const example = <DataTable {...props} />
const stateRef = createRef<TableStateController>()
declare const loadPreferences: (
    key: string,
    signal?: AbortSignal,
) => Promise<unknown>
declare const savePreferences: (
    key: string,
    state: TableStateSnapshot,
) => Promise<void>
const storage: TableStateStorage = {
    load: loadPreferences,
    save: savePreferences,
}
export const persistedExample = (
    <DataTable
        {...props}
        stateRef={stateRef}
        persistence={{
            key: 'account:members',
            storage,
            fields: [
                'sorting',
                'columnSizing',
                'columnVisibility',
                'columnFilters',
            ],
            onError: (_error, context) =>
                context.operation satisfies 'load' | 'save' | 'remove',
        }}
    />
)
export const invalidRowId = (
    // @ts-expect-error Selection and details require stable string row IDs.
    <DataTable {...props} getRowId={(row) => row.active} />
)
// @ts-expect-error The managed data table requires an explicit identity function.
export const missingRowId = <DataTable data={data} columns={columns} />
export const invalidFilter: TableColumn<Member> = {
    accessorKey: 'name',
    // @ts-expect-error Filter configuration is constrained to supported renderers.
    meta: { filter: { type: 'invented' } },
}

export const rowExpansionAndDesign: DataTableProps<Member> = {
    ...props,
    expandOnRowClick: true,
    headerDividers: true,
    classNames: {
        filterButton: 'rounded border px-3',
        filterButtonActive: 'border-blue-500',
        paginationIcon: 'size-4',
        sortIcon: 'size-6',
        headerDivider: 'bg-blue-500',
        expandedContent: 'p-4',
    },
    onRowDoubleClick: (row, event) => {
        row.original.active satisfies boolean
        event.currentTarget satisfies HTMLTableRowElement
    },
}

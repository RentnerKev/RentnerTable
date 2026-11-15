import { DataTable, createTableColumnHelper } from '../../index.ts'
import type {
    DataTableProps,
    TableColumn,
    TableDateRange,
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
}
export const example = <DataTable {...props} />
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

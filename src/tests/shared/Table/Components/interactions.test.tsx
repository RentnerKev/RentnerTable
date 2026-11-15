import { afterEach, describe, expect, test } from 'bun:test'
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react'
import { createRef, useState } from 'react'
import {
    Table,
    DataTable,
    createTableColumnHelper,
    useDataTableLogic,
} from '../../../../index.ts'
import type { TableRowOrderChange } from '../../../../index.ts'

afterEach(cleanup)
interface Record {
    id: string
    name: string
    role: string
}
const data: readonly Record[] = [
    { id: 'a', name: 'Alpha', role: 'Developer' },
    { id: 'b', name: 'Beta', role: 'Designer' },
    { id: 'c', name: 'Gamma', role: 'Developer' },
    { id: 'd', name: 'Delta', role: 'Designer' },
]
const identify = (row: Record) => row.id
const helper = createTableColumnHelper<Record>()
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        minSize: 80,
        maxSize: 240,
        cell: ({ getValue }) => (
            <>
                <span>{getValue()}</span>
                <button type="button">Edit {getValue()}</button>
            </>
        ),
    }),
    helper.accessor('role', { header: 'Role', enableResizing: false }),
])

describe('table interactions', () => {
    test('requires the opt-in flag, preserves selection and pagination, and blocks reordering while sorted', () => {
        const { result, rerender } = renderHook(
            ({ enabled }) =>
                useDataTableLogic({
                    data,
                    columns,
                    getRowId: identify,
                    selectable: true,
                    renderExpandedRow: (row) => row.id,
                    pageSize: 2,
                    reorderableRows: enabled,
                }),
            { initialProps: { enabled: false } },
        )
        act(() => result.current.handler.handleRowReorder('a', 'c'))
        expect(result.current.table.options.data).toBe(data)
        rerender({ enabled: true })
        act(() => {
            result.current.table.getRow('c').toggleSelected()
            result.current.table.getRow('c').toggleExpanded()
            result.current.table.nextPage()
        })
        act(() => result.current.handler.handleRowReorder('c', 'd'))
        expect(result.current.table.options.data.map(identify)).toEqual([
            'a',
            'b',
            'd',
            'c',
        ])
        expect(result.current.table.state.pagination.pageIndex).toBe(1)
        expect(result.current.table.getRow('c').getIsExpanded()).toBe(true)
        expect(
            result.current.table
                .getSelectedRowModel()
                .rows.map((row) => row.id),
        ).toEqual(['c'])
        act(() =>
            result.current.table.setSorting([{ id: 'name', desc: false }]),
        )
        act(() => result.current.handler.handleRowReorder('a', 'd'))
        expect(result.current.table.options.data.map(identify)).toEqual([
            'a',
            'b',
            'd',
            'c',
        ])
    })
    test('reorders the entire controlled data source when only filtered rows are visible', () => {
        const changes: TableRowOrderChange[] = []
        const { result } = renderHook(() => {
            const [records, setRecords] = useState<readonly Record[]>(data)
            return useDataTableLogic({
                data: records,
                columns,
                getRowId: identify,
                reorderableRows: true,
                onRowOrderChange: (next, change) => {
                    setRecords(next)
                    changes.push(change)
                },
            })
        })
        act(() =>
            result.current.table.getColumn('role').setFilterValue('Developer'),
        )
        act(() => result.current.handler.handleRowReorder('a', 'c'))
        expect(result.current.table.options.data.map(identify)).toEqual([
            'b',
            'c',
            'a',
            'd',
        ])
        expect(result.current.state.rows.map((row) => row.id)).toEqual([
            'c',
            'a',
        ])
        expect(changes).toEqual([
            { activeId: 'a', overId: 'c', fromIndex: 0, toIndex: 2 },
        ])
        act(() => result.current.handler.handleRowReorder('a', 'missing'))
        expect(changes).toHaveLength(1)
    })
    test('forwards typed row and cell events and excludes controls from row navigation', () => {
        const events: string[] = []
        render(
            <Table
                data={data}
                columns={columns}
                getRowId={identify}
                onRowClick={(row) => events.push(`row:${row.original.id}`)}
                onCellClick={(cell) =>
                    events.push(
                        `cell:${cell.column.id}:${cell.row.original.id}`,
                    )
                }
                onRowDoubleClick={(row) => events.push(`double:${row.id}`)}
                onCellDoubleClick={(cell) =>
                    events.push(`double-cell:${cell.row.id}`)
                }
                onRowContextMenu={(row, event) => {
                    event.preventDefault()
                    events.push(`context:${row.id}`)
                }}
            />,
        )
        fireEvent.click(screen.getByText('Alpha', { exact: true }))
        expect(events).toEqual(['cell:name:a', 'row:a'])
        events.length = 0
        fireEvent.click(
            screen.getByRole('button', { name: 'Edit Alpha', exact: true }),
        )
        expect(events).toEqual(['cell:name:a'])
        events.length = 0
        fireEvent.doubleClick(screen.getByText('Alpha', { exact: true }))
        expect(events).toEqual(['double-cell:a', 'double:a'])
        events.length = 0
        expect(
            fireEvent.contextMenu(screen.getByText('Alpha', { exact: true })),
        ).toBe(false)
        expect(events).toEqual(['context:a'])
    })
    test('lets cell handlers intercept events while root native listeners still receive them', () => {
        const events: string[] = []
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={identify}
                onRowClick={() => events.push('row')}
                onRowContextMenu={() => events.push('row-context')}
                onCellClick={(cell, event) => {
                    event.preventDefault()
                    events.push(cell.row.original.name)
                }}
                onCellContextMenu={(cell, event) => {
                    event.preventDefault()
                    events.push(cell.column.id)
                }}
                tableProps={{
                    onContextMenu: (event) =>
                        events.push(`table:${event.defaultPrevented}`),
                }}
            />,
        )
        fireEvent.click(screen.getByText('Alpha', { exact: true }))
        expect(events).toEqual(['Alpha'])
        events.length = 0
        fireEvent.contextMenu(screen.getByText('Alpha', { exact: true }))
        expect(events).toEqual(['name', 'table:true'])
    })
    test('resizes with the keyboard, honors limits and disabled columns, resets, and forwards the native ref', async () => {
        const ref = createRef<HTMLTableElement>()
        const { rerender } = render(
            <Table
                ref={ref}
                data={data}
                columns={columns}
                getRowId={identify}
            />,
        )
        expect(screen.queryByRole('separator')).toBeNull()
        rerender(
            <Table
                ref={ref}
                data={data}
                columns={columns}
                getRowId={identify}
                resizableColumns
            />,
        )
        expect(ref.current).toBe(screen.getByRole('table'))
        const handle = screen.getByRole('separator', { name: 'Resize Name' })
        expect(screen.getAllByRole('separator')).toHaveLength(1)
        fireEvent.mouseDown(handle, { button: 2, clientX: 100 })
        expect(handle.hasAttribute('data-resizing')).toBe(false)
        fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true })
        await waitFor(() =>
            expect(handle.getAttribute('aria-valuenow')).toBe('200'),
        )
        fireEvent.keyDown(handle, { key: 'End' })
        expect(handle.getAttribute('aria-valuenow')).toBe('240')
        fireEvent.keyDown(handle, { key: 'ArrowRight' })
        expect(handle.getAttribute('aria-valuenow')).toBe('240')
        for (let i = 0; i < 5; i++)
            fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true })
        expect(handle.getAttribute('aria-valuenow')).toBe('80')
        fireEvent.doubleClick(handle)
        expect(handle.getAttribute('aria-valuenow')).toBe('150')
        expect(
            screen
                .getByRole('columnheader', { name: /Name/ })
                .hasAttribute('aria-sort'),
        ).toBe(false)
    })
    test('honors controlled widths and right-to-left keyboard resizing', () => {
        const changes: number[] = []
        function Controlled() {
            const [sizing, setSizing] = useState({ name: 120 })
            return (
                <DataTable
                    data={data}
                    columns={columns}
                    getRowId={identify}
                    resizableColumns
                    tableOptions={{
                        columnResizeDirection: 'rtl',
                        state: { columnSizing: sizing },
                        onColumnSizingChange: (updater) =>
                            setSizing((current) => {
                                const next =
                                    typeof updater === 'function'
                                        ? updater(current)
                                        : updater
                                const name = next.name ?? 150
                                changes.push(name)
                                return { name }
                            }),
                    }}
                />
            )
        }
        render(<Controlled />)
        const handle = screen.getByRole('separator', { name: 'Resize Name' })
        fireEvent.keyDown(handle, { key: 'ArrowLeft' })
        expect(handle.getAttribute('aria-valuenow')).toBe('130')
        fireEvent.keyDown(handle, { key: 'ArrowRight' })
        expect(handle.getAttribute('aria-valuenow')).toBe('120')
        expect(changes).toContain(130)
    })
})

import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import {
    DataTable,
    createTableColumnHelper,
    useDataTableLogic,
} from '../../../../index.ts'
import type {
    DataTableContext,
    TableColumn,
    TableRow,
} from '../../../../index.ts'

afterEach(cleanup)

interface Person {
    id: string
    name: string
    role: string
    joined: string
}
const data: readonly Person[] = Array.from({ length: 23 }, (_, index) => ({
    id: `id-${index + 1}`,
    name: `Member ${String(index + 1).padStart(2, '0')}`,
    role: index % 2 === 0 ? 'Developer' : 'Designer',
    joined: '2026-11-15',
}))
const helper = createTableColumnHelper<Person>()
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        meta: { filter: { type: 'text' } },
    }),
    helper.accessor('role', {
        header: 'Role',
        meta: {
            filter: {
                type: 'select',
                options: [
                    { value: 'Developer', label: 'Developer' },
                    { value: 'Designer', label: 'Designer' },
                ],
            },
        },
    }),
])
const getRowId = (row: Person) => row.id
const getRowLabel = (row: Person) => row.name
const renderDetails = (row: TableRow<Person>) => <p>Detail {row.id}</p>
const renderBulk = ({ selectedRows }: DataTableContext<Person>) => (
    <span>Bulk: {selectedRows.map((row) => row.id).join(',')}</span>
)

function rowNames() {
    return screen.getByRole('table').querySelectorAll('tbody tr[data-row-id]')
}

describe('reusable data table', () => {
    test('paginates, reports the filtered row range and preserves result counts', async () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                title="People"
            />,
        )
        expect(rowNames()).toHaveLength(10)
        expect(screen.getByText('1–10 of 23 entries')).toBeDefined()
        fireEvent.click(
            screen.getByRole('button', { name: 'Next page', exact: true }),
        )
        await waitFor(() =>
            expect(screen.getByText('11–20 of 23 entries')).toBeDefined(),
        )
        expect(screen.getByText('Member 11')).toBeDefined()
        fireEvent.click(
            screen.getByRole('button', { name: 'Last page', exact: true }),
        )
        await waitFor(() => expect(rowNames()).toHaveLength(3))
        expect(
            screen
                .getByRole('button', { name: 'Next page', exact: true })
                .hasAttribute('disabled'),
        ).toBe(true)
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Search table' }),
            { target: { value: '  MEMBER 03  ' } },
        )
        await waitFor(() => expect(rowNames()).toHaveLength(1))
        expect(screen.getByText('Member 03')).toBeDefined()
        expect(screen.getByText('1–1 of 1 entries')).toBeDefined()
    })

    test('distinguishes no matching results from an empty data source and clears filters', async () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                title="People"
            />,
        )
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Search table' }),
            { target: { value: 'missing member' } },
        )
        await waitFor(() =>
            expect(screen.getByRole('status').textContent).toContain(
                'No results found',
            ),
        )
        expect(screen.queryByText('No entries found.')).toBeNull()
        fireEvent.click(
            within(screen.getByRole('table')).getByRole('button', {
                name: 'Reset filters',
                exact: true,
            }),
        )
        await waitFor(() => expect(rowNames()).toHaveLength(10))
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Search table',
                }) as HTMLInputElement
            ).value,
        ).toBe('')
    })

    test('filters text columns independently and ignores hidden filter controls', async () => {
        render(<DataTable data={data} columns={columns} getRowId={getRowId} />)
        fireEvent.click(
            screen.getByRole('button', { name: 'Filters', exact: true }),
        )
        const filters = screen.getByRole('region', { name: 'Filters' })
        expect(
            screen
                .getByRole('button', { name: 'Filters', exact: true })
                .getAttribute('aria-controls'),
        ).toBe(filters.id)
        expect(screen.getByRole('table').contains(filters)).toBe(false)
        expect(
            within(filters).getByRole('group', { name: 'Name' }),
        ).toBeDefined()
        fireEvent.change(screen.getByRole('textbox', { name: 'Filter Name' }), {
            target: { value: 'Member 09' },
        })
        await waitFor(() => expect(rowNames()).toHaveLength(1))
        expect(screen.getByText('Member 09')).toBeDefined()
        fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
        expect(
            screen.queryByRole('textbox', { name: 'Filter Name' }),
        ).toBeNull()
        expect(screen.queryByRole('region', { name: 'Filters' })).toBeNull()
        expect(rowNames()).toHaveLength(1)
    })

    test('selects the current page, reports mixed selection and retains IDs across pages', async () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                getRowLabel={getRowLabel}
                selectable
                bulkActions={renderBulk}
            />,
        )
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Select all rows on this page',
            }),
        )
        await waitFor(() =>
            expect(screen.getByText('10 selected')).toBeDefined(),
        )
        expect(screen.getByText(/Bulk: id-1,id-2/)).toBeDefined()
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Select Member 01',
                exact: true,
            }),
        )
        await waitFor(() =>
            expect(
                screen
                    .getByRole('checkbox', {
                        name: 'Select all rows on this page',
                    })
                    .getAttribute('aria-checked'),
            ).toBe('mixed'),
        )
        fireEvent.click(
            screen.getByRole('button', { name: 'Next page', exact: true }),
        )
        await waitFor(() =>
            expect(
                screen.getByRole('checkbox', {
                    name: 'Select Member 11',
                    exact: true,
                }),
            ).toBeDefined(),
        )
        expect(screen.getByText('9 selected')).toBeDefined()
        fireEvent.click(
            screen.getByRole('button', { name: 'Previous page', exact: true }),
        )
        await waitFor(() =>
            expect(
                (
                    screen.getByRole('checkbox', {
                        name: 'Select Member 02',
                        exact: true,
                    }) as HTMLInputElement
                ).checked,
            ).toBe(true),
        )
        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Select Member 01',
                    exact: true,
                }) as HTMLInputElement
            ).checked,
        ).toBe(false)
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Clear selection',
                exact: true,
            }),
        )
        await waitFor(() => expect(screen.queryByText('9 selected')).toBeNull())
    })

    test('respects rows that are not selectable', async () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                getRowLabel={getRowLabel}
                selectable={(row) => row.id !== 'id-1'}
            />,
        )
        expect(
            screen
                .getByRole('checkbox', {
                    name: 'Select Member 01',
                    exact: true,
                })
                .hasAttribute('disabled'),
        ).toBe(true)
        fireEvent.click(
            screen.getByRole('checkbox', {
                name: 'Select all rows on this page',
            }),
        )
        await waitFor(() =>
            expect(screen.getByText('9 selected')).toBeDefined(),
        )
    })

    test('expands details without invalid table markup and keeps row IDs stable', async () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                getRowLabel={getRowLabel}
                renderExpandedRow={renderDetails}
            />,
        )
        const trigger = screen.getByRole('button', {
            name: 'Expand details for Member 01',
            exact: true,
        })
        fireEvent.click(trigger)
        await waitFor(() =>
            expect(screen.getByText('Detail id-1')).toBeDefined(),
        )
        expect(trigger.getAttribute('aria-expanded')).toBe('true')
        expect(
            document.getElementById(trigger.getAttribute('aria-controls') ?? '')
                ?.textContent,
        ).toBe('Detail id-1')
        expect(
            screen
                .getByText('Detail id-1')
                .closest('td')
                ?.getAttribute('colspan'),
        ).toBe('3')
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Collapse details for Member 01',
                exact: true,
            }),
        )
        await waitFor(() =>
            expect(screen.queryByText('Detail id-1')).toBeNull(),
        )
    })

    test('provides translated loading, error, retry and custom empty states', () => {
        const retry = mock(() => {})
        const view = render(
            <DataTable
                data={[]}
                columns={columns}
                getRowId={getRowId}
                locale="de"
                isLoading
            />,
        )
        expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true')
        expect(screen.getByRole('status').textContent).toBe(
            'Einträge werden geladen …',
        )
        view.rerender(
            <DataTable
                data={[]}
                columns={columns}
                getRowId={getRowId}
                locale="de"
                error
                onRetry={retry}
            />,
        )
        expect(screen.getByRole('alert').textContent).toContain(
            'Die Einträge konnten nicht geladen werden.',
        )
        fireEvent.click(
            screen.getByRole('button', { name: 'Erneut versuchen' }),
        )
        expect(retry).toHaveBeenCalledTimes(1)
        view.rerender(
            <DataTable
                data={[]}
                columns={columns}
                getRowId={getRowId}
                emptyState={<a href="/new">Create first person</a>}
            />,
        )
        expect(screen.getByRole('status').textContent).toBe(
            'Create first person',
        )
    })

    test('renders data and recoverable empty results when a conditional error is false', () => {
        const view = render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                error={false}
            />,
        )
        expect(screen.queryByRole('alert') === null).toBe(true)
        expect(rowNames()).toHaveLength(10)
        fireEvent.change(
            screen.getByRole('textbox', { name: 'Search table' }),
            {
                target: { value: 'missing person' },
            },
        )
        fireEvent.click(
            within(screen.getByRole('table')).getByRole('button', {
                name: 'Reset filters',
            }),
        )
        expect(rowNames()).toHaveLength(10)
        view.rerender(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                error={false}
                isLoading
            />,
        )
        expect(screen.queryByRole('alert') === null).toBe(true)
        expect(screen.getByRole('status').textContent).toContain('Loading')
    })

    test('hides selection UI while disabled and restores the stored selection when enabled', () => {
        const props = {
            data,
            columns,
            getRowId,
            bulkActions: renderBulk,
            tableOptions: { initialState: { rowSelection: { 'id-1': true } } },
        }
        const view = render(<DataTable {...props} selectable={false} />)
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
        expect(screen.queryByText('Bulk: id-1') === null).toBe(true)
        expect(
            screen.getByRole('table').querySelector('[data-selected]') === null,
        ).toBe(true)
        view.rerender(<DataTable {...props} selectable />)
        expect(screen.getByText('Bulk: id-1')).toBeDefined()
        expect(
            screen
                .getByRole('table')
                .querySelector('[data-selected]')
                ?.getAttribute('data-row-id'),
        ).toBe('id-1')
    })

    test('announces only the primary sort column when multiple columns are sorted', () => {
        render(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                tableOptions={{
                    initialState: {
                        sorting: [
                            { id: 'name', desc: false },
                            { id: 'role', desc: true },
                        ],
                    },
                }}
            />,
        )
        const sorted = screen
            .getAllByRole('columnheader')
            .filter((header) => header.hasAttribute('aria-sort'))
        expect(sorted.length).toBe(1)
        expect(sorted[0]?.textContent).toContain('Name')
        expect(sorted[0]?.getAttribute('aria-sort')).toBe('ascending')
    })

    test('server-renders a complete data table without browser access', () => {
        const markup = renderToString(
            <DataTable
                data={data}
                columns={columns}
                getRowId={getRowId}
                title="People"
                selectable
            />,
        )
        expect(markup).toContain('data-rentner-data-table')
        expect(markup).toContain('Member 01')
        expect(markup).toContain('1–10 of 23 entries')
        expect(markup).not.toContain('Member 11')
    })
})

describe('headless and controlled state', () => {
    test('combines prepared text and date filters without replacing the public query state', () => {
        const rows = data.slice(0, 3).map((person, index) => ({
            id: person.id,
            name: person.name,
            role: person.role,
            joined:
                index === 1
                    ? '2026-11-16'
                    : index === 2
                      ? 'invalid'
                      : person.joined,
        }))
        const dateColumns = helper.columns([
            ...columns,
            helper.accessor('joined', {
                header: 'Joined',
                meta: { filter: { type: 'dateRange' } },
            }),
        ])
        const range = { from: '2026-11-16', to: '2026-11-16' }
        const { result } = renderHook(() =>
            useDataTableLogic({
                data: rows,
                columns: dateColumns,
                getRowId,
                tableOptions: {
                    initialState: {
                        globalFilter: ' MEMBER ',
                        columnFilters: [{ id: 'joined', value: range }],
                    },
                },
            }),
        )
        expect(result.current.state.rows.map((row) => row.id)).toEqual(['id-2'])
        expect(result.current.state.search).toBe(' MEMBER ')
        expect(result.current.table.state.columnFilters[0]?.value).toEqual(
            range,
        )
        act(() =>
            result.current.table
                .getColumn('joined')
                ?.setFilterValue({ from: '2026-02-31' }),
        )
        expect(result.current.state.totalRows).toBe(0)
    })

    test('updates page size, visibility and filter metadata through the native instance', async () => {
        const { result } = renderHook(() =>
            useDataTableLogic({ data, columns, getRowId }),
        )
        act(() => result.current.handler.handlePageSize(25))
        await waitFor(() => expect(result.current.state.rows).toHaveLength(23))
        expect(result.current.state.page).toBe(1)
        act(() =>
            result.current.table.getColumn('role')?.toggleVisibility(false),
        )
        await waitFor(() => expect(result.current.state.columnCount).toBe(1))
        act(() =>
            result.current.table.getColumn('role')?.setFilterValue('Designer'),
        )
        await waitFor(() => expect(result.current.state.totalRows).toBe(11))
        expect(
            result.current.state.rows.every(
                (row) => row.original.role === 'Designer',
            ),
        ).toBe(true)
    })

    test('clamps a removed last page after data refresh', async () => {
        const { result, rerender } = renderHook(
            ({ rows }) =>
                useDataTableLogic({
                    data: rows,
                    columns,
                    getRowId,
                    tableOptions: {
                        autoResetPageIndex: false,
                        initialState: {
                            pagination: { pageIndex: 2, pageSize: 10 },
                        },
                    },
                }),
            { initialProps: { rows: data } },
        )
        expect(result.current.state.page).toBe(3)
        rerender({ rows: data.slice(0, 2) })
        await waitFor(() => expect(result.current.state.page).toBe(1))
        expect(result.current.state.rows).toHaveLength(2)
        expect(result.current.state.lastRow).toBe(2)
    })

    test('supports externally owned server pagination and keeps remote filtering manual', async () => {
        const { result } = renderHook(() => {
            const [pagination, setPagination] = useState({
                pageIndex: 2,
                pageSize: 10,
            })
            const [globalFilter, setGlobalFilter] = useState('')
            return useDataTableLogic({
                data: data.slice(0, 6),
                columns,
                getRowId,
                tableOptions: {
                    manualPagination: true,
                    manualFiltering: true,
                    manualSorting: true,
                    rowCount: 51,
                    state: { pagination, globalFilter },
                    onPaginationChange: setPagination,
                    onGlobalFilterChange: setGlobalFilter,
                },
            })
        })
        expect(result.current.state.firstRow).toBe(21)
        expect(result.current.state.lastRow).toBe(26)
        expect(result.current.state.totalPages).toBe(6)
        act(() => result.current.handler.handleNextPage())
        await waitFor(() => expect(result.current.state.page).toBe(4))
        act(() => result.current.handler.handleSearch('server owns this query'))
        await waitFor(() =>
            expect(result.current.state.search).toBe('server owns this query'),
        )
        expect(result.current.state.page).toBe(1)
        act(() => result.current.handler.handleNextPage())
        await waitFor(() => expect(result.current.state.page).toBe(2))
        act(() =>
            result.current.table.getColumn('role')?.setFilterValue('Designer'),
        )
        await waitFor(() => expect(result.current.state.page).toBe(1))
        act(() => result.current.handler.handleNextPage())
        await waitFor(() => expect(result.current.state.page).toBe(2))
        act(() => result.current.table.setSorting([{ id: 'name', desc: true }]))
        await waitFor(() => expect(result.current.state.page).toBe(1))
        expect(result.current.state.rows).toHaveLength(6)
        expect(result.current.state.totalRows).toBe(51)
    })

    test('resets controlled server pagination once per query change and avoids redundant updates on the first page', async () => {
        const onPaginationChange = mock(() => {})
        const { result } = renderHook(() => {
            const [pagination, setPagination] = useState({
                pageIndex: 2,
                pageSize: 10,
            })
            const [globalFilter, setGlobalFilter] = useState('')
            return useDataTableLogic({
                data,
                columns,
                getRowId,
                tableOptions: {
                    manualPagination: true,
                    manualFiltering: true,
                    rowCount: 51,
                    state: { pagination, globalFilter },
                    onGlobalFilterChange: setGlobalFilter,
                    onPaginationChange: (updater) => {
                        onPaginationChange()
                        setPagination(updater)
                    },
                },
            })
        })
        act(() => result.current.handler.handleSearch('first query'))
        await waitFor(() => expect(result.current.state.page).toBe(1))
        expect(onPaginationChange).toHaveBeenCalledTimes(1)
        onPaginationChange.mockClear()
        act(() => result.current.handler.handleSearch('second query'))
        await waitFor(() =>
            expect(result.current.state.search).toBe('second query'),
        )
        expect(onPaginationChange).toHaveBeenCalledTimes(0)
    })

    test('honors explicitly disabled page resets when searching server-owned data', async () => {
        const { result } = renderHook(() =>
            useDataTableLogic({
                data,
                columns,
                getRowId,
                tableOptions: {
                    manualPagination: true,
                    manualFiltering: true,
                    autoResetPageIndex: false,
                    rowCount: 51,
                    initialState: {
                        pagination: { pageIndex: 2, pageSize: 10 },
                    },
                },
            }),
        )
        act(() => result.current.handler.handleSearch('server query'))
        await waitFor(() =>
            expect(result.current.state.search).toBe('server query'),
        )
        expect(result.current.state.page).toBe(3)
    })

    test('can render all rows without pagination and retains custom column filters', () => {
        const custom: readonly TableColumn<Person>[] = [
            {
                accessorKey: 'name',
                header: 'Name',
                filterFn: (row, columnId, value) =>
                    row.getValue(columnId) === value,
            },
        ]
        const { result } = renderHook(() =>
            useDataTableLogic({
                data,
                columns: custom,
                getRowId,
                pagination: false,
                tableOptions: {
                    initialState: {
                        columnFilters: [{ id: 'name', value: 'Member 01' }],
                    },
                },
            }),
        )
        expect(result.current.state.rows).toHaveLength(1)
        expect(result.current.state.rows[0]?.original.name).toBe('Member 01')
    })
})

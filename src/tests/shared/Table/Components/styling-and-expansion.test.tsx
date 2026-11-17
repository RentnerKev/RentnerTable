import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import type { ExpandedState } from '@tanstack/react-table'
import {
    DataTable,
    Table,
    TableProvider,
    createTableColumnHelper,
} from '../../../../index.ts'

afterEach(cleanup)

interface Entry {
    id: string
    name: string
    role: string
}
const entries: readonly Entry[] = [
    { id: 'a', name: 'Alpha', role: 'Developer' },
    { id: 'b', name: 'Beta', role: 'Designer' },
]
const column = createTableColumnHelper<Entry>()
const columns = column.columns([
    column.accessor('name', {
        header: 'Name',
        meta: { filter: { type: 'text' } },
        cell: ({ getValue }) => (
            <div>
                <span>{getValue()}</span>
                <button type="button">Edit {getValue()}</button>
                <a href="#profile">Profile {getValue()}</a>
                <span data-no-row-click>Ignore {getValue()}</span>
            </div>
        ),
    }),
    column.accessor('role', { header: 'Role' }),
])
const base = {
    data: entries,
    columns,
    getRowId: (entry: Entry) => entry.id,
    renderExpandedRow: (row: { id: string }) => <p>Details {row.id}</p>,
}
function findRow(id = 'a') {
    const element = document.querySelector('tr[data-row-id="' + id + '"]')
    if (!(element instanceof HTMLTableRowElement))
        throw new Error('Missing row')
    return element
}

function ControlledTable() {
    const [expanded, setExpanded] = useState<ExpandedState>({})
    return (
        <DataTable
            {...base}
            expandOnRowClick
            tableOptions={{
                state: { expanded },
                onExpandedChange: setExpanded,
            }}
        />
    )
}

describe('row expansion and event composition', () => {
    test('keeps row expansion opt-in and retains the accessible detail button', () => {
        render(<DataTable {...base} />)
        fireEvent.click(screen.getByText('Alpha', { exact: true }))
        expect(screen.queryByText('Details a')).toBeNull()
        fireEvent.click(
            screen.getByRole('button', { name: 'Expand details for a' }),
        )
        expect(screen.getByText('Details a')).toBeDefined()
    })

    test('expands from text, another cell and blank row space without requiring the arrow', () => {
        render(
            <DataTable
                {...base}
                expandOnRowClick
                getRowLabel={(entry) => entry.name}
            />,
        )
        fireEvent.click(screen.getByText('Alpha', { exact: true }))
        expect(screen.getByText('Details a')).toBeDefined()
        fireEvent.click(screen.getByText('Developer', { exact: true }))
        expect(screen.queryByText('Details a')).toBeNull()
        fireEvent.click(findRow())
        expect(screen.getByText('Details a')).toBeDefined()
        fireEvent.click(
            screen.getByRole('button', { name: 'Collapse details for Alpha' }),
        )
        expect(screen.queryByText('Details a')).toBeNull()
    })

    test('preserves controls and explicit row-click exclusions', () => {
        const events: string[] = []
        render(
            <DataTable
                {...base}
                expandOnRowClick
                onRowClick={(record) => events.push(record.id)}
                selectable
            />,
        )
        fireEvent.click(screen.getByRole('button', { name: 'Edit Alpha' }))
        fireEvent.click(screen.getByRole('link', { name: 'Profile Alpha' }))
        fireEvent.click(screen.getByText('Ignore Alpha'))
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select a' }))
        expect(screen.queryByText('Details a')).toBeNull()
        expect(events).toEqual([])
        expect(
            screen
                .getByRole('checkbox', { name: 'Select a' })
                .getAttribute('aria-checked'),
        ).toBe('true')
    })

    test('lets row and cell callbacks veto expansion through preventDefault', () => {
        const { rerender } = render(
            <DataTable
                {...base}
                expandOnRowClick
                onRowClick={(_record, event) => event.preventDefault()}
            />,
        )
        fireEvent.click(findRow())
        expect(screen.queryByText('Details a')).toBeNull()
        rerender(
            <DataTable
                {...base}
                expandOnRowClick
                onCellClick={(_cell, event) => event.preventDefault()}
            />,
        )
        fireEvent.click(screen.getByText('Alpha', { exact: true }))
        expect(screen.queryByText('Details a')).toBeNull()
    })

    test('handles a native double-click sequence without toggling the row twice', () => {
        const events: string[] = []
        render(
            <DataTable
                {...base}
                expandOnRowClick
                onRowDoubleClick={(record) => events.push(record.id)}
                onCellDoubleClick={(cell) => events.push(cell.column.id)}
            />,
        )
        const name = screen.getByText('Alpha', { exact: true })
        fireEvent.click(name, { detail: 1 })
        fireEvent.click(name, { detail: 2 })
        fireEvent.doubleClick(name, { detail: 2 })
        expect(screen.getByText('Details a')).toBeDefined()
        expect(events).toEqual(['name', 'a'])
        fireEvent.doubleClick(
            screen.getByRole('button', { name: 'Edit Alpha' }),
        )
        expect(events).toEqual(['name', 'a', 'name'])
    })

    test('respects non-expandable records and controlled expansion state', () => {
        const { unmount } = render(
            <DataTable
                {...base}
                expandOnRowClick
                tableOptions={{
                    getRowCanExpand: (record) => record.id === 'b',
                }}
            />,
        )
        fireEvent.click(findRow())
        expect(screen.queryByText('Details a')).toBeNull()
        fireEvent.click(findRow('b'))
        expect(screen.getByText('Details b')).toBeDefined()
        unmount()
        render(<ControlledTable />)
        fireEvent.click(findRow())
        expect(screen.getByText('Details a')).toBeDefined()
        fireEvent.click(findRow())
        expect(screen.queryByText('Details a')).toBeNull()
    })

    test('opens at most one row and reports its stable ID when toggled', () => {
        const changes: (string | null)[] = []
        render(
            <DataTable
                {...base}
                expansionMode="single"
                onExpandedRowIdChange={(id) => changes.push(id)}
                tableOptions={{ initialState: { expanded: { a: true, b: true } } }}
            />,
        )
        expect(screen.getByText('Details a')).toBeDefined()
        expect(screen.queryByText('Details b')).toBeNull()
        fireEvent.click(
            screen.getByRole('button', { name: 'Expand details for b' }),
        )
        expect(screen.queryByText('Details a')).toBeNull()
        expect(screen.getByText('Details b')).toBeDefined()
        fireEvent.click(
            screen.getByRole('button', { name: 'Collapse details for b' }),
        )
        expect(screen.queryByText('Details b')).toBeNull()
        expect(changes).toEqual(['b', null])
    })

    test('renders externally controlled details without an expand column', () => {
        const { rerender } = render(
            <DataTable {...base} expandedRowId="a" showExpandColumn={false} />,
        )
        const table = screen.getByRole('table')
        expect(within(table).getAllByRole('columnheader')).toHaveLength(2)
        const detail = screen.getByText('Details a').closest('td')
        expect(detail?.colSpan).toBe(2)
        expect(within(table).queryByRole('button', { name: /details for/i })).toBeNull()
        rerender(
            <DataTable {...base} expandedRowId={null} showExpandColumn={false} />,
        )
        expect(screen.queryByText('Details a')).toBeNull()
    })
})

describe('public styling slots', () => {
    test('inherits provider slots, applies local overrides and preserves behavior', () => {
        const { container } = render(
            <TableProvider
                headerDividers
                classNames={{
                    sortIcon: 'global-sort',
                    filterButton: 'global-filter',
                    paginationIcon: 'global-page',
                }}
            >
                <DataTable
                    {...base}
                    classNames={{
                        sortIcon: 'local-sort',
                        filterButtonActive: '',
                    }}
                />
            </TableProvider>,
        )
        const sort = container.querySelector('[data-table-sort-icon]')
        expect(sort?.classList.contains('local-sort')).toBe(true)
        expect(sort?.classList.contains('global-sort')).toBe(false)
        expect(sort?.classList.contains('size-4.5')).toBe(false)
        expect(
            container.querySelectorAll('[data-table-header-divider]'),
        ).toHaveLength(1)
        const filter = screen.getByRole('button', {
            name: 'Filters',
            exact: true,
        })
        expect(filter.classList.contains('global-filter')).toBe(true)
        expect(filter.classList.contains('focus-visible:outline-2')).toBe(true)
        fireEvent.click(filter)
        expect(filter.getAttribute('aria-pressed')).toBe('true')
        expect(filter.classList.contains('before:bg-rentner-accent')).toBe(
            false,
        )
        expect(
            container
                .querySelector('nav svg')
                ?.classList.contains('global-page'),
        ).toBe(true)
        fireEvent.click(screen.getByRole('button', { name: /Name/ }))
        expect(
            screen
                .getByRole('columnheader', { name: /Name/ })
                .getAttribute('aria-sort'),
        ).toBe('ascending')
    })

    test('inherits undefined keys, supports nested providers and explicit empty slots', () => {
        const { container } = render(
            <TableProvider
                headerDividers
                classNames={{
                    sortIcon: 'inherited-icon',
                    headerCell: 'inherited-header',
                }}
            >
                <TableProvider classNames={{ sortIcon: undefined }}>
                    <Table
                        data={entries}
                        columns={columns}
                        headerDividers={false}
                        classNames={{ sortIcon: '' }}
                    />
                </TableProvider>
            </TableProvider>,
        )
        expect(
            container.querySelectorAll('[data-table-header-divider]'),
        ).toHaveLength(0)
        expect(
            container
                .querySelector('th')
                ?.classList.contains('inherited-header'),
        ).toBe(true)
        expect(
            container
                .querySelector('[data-table-sort-icon]')
                ?.classList.contains('inherited-icon'),
        ).toBe(false)
        expect(
            container
                .querySelector('[data-table-sort-icon]')
                ?.classList.contains('size-5'),
        ).toBe(false)
    })
})

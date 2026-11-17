import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { DataTable } from '../../../../index.ts'
import type { TableColumn } from '../../../../index.ts'

afterEach(cleanup)

interface Person {
    id: string
    name: string
}
const data: Person[] = [{ id: 'bruno', name: 'Bruno' }, { id: 'anna', name: 'Anna' }]
const columns: TableColumn<Person>[] = [{
    accessorKey: 'name',
    header: 'Name',
    cell: function Counter({ row }) {
        const [count, setCount] = useState(0)
        return <button type="button" onClick={() => setCount(value => value + 1)}>{row.original.name}: {count}</button>
    },
}]

test('cell hooks keep their state with the record when rows are sorted', () => {
    const view = render(<DataTable data={data} columns={columns} getRowId={row => row.id} columnFilters={false} columnVisibility={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bruno: 0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Name — Sort ascending' }))
    expect(view.container.querySelector('tbody tr')?.getAttribute('data-row-id')).toBe('anna')
    expect(screen.getByRole('button', { name: 'Bruno: 1' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Bruno: 1' }))
    expect(screen.getByRole('button', { name: 'Bruno: 2' })).toBeDefined()
})

test('a new cell renderer replaces the previous renderer without retaining stale UI', () => {
    const view = render(<DataTable data={data} columns={columns} getRowId={row => row.id} />)
    view.rerender(<DataTable data={data} columns={[{ accessorKey: 'name', header: 'Name', cell: ({ row }) => `Updated ${row.original.name}` }]} getRowId={row => row.id} />)
    expect(screen.queryByRole('button', { name: 'Bruno: 0' })).toBeNull()
    expect(screen.getByText('Updated Bruno')).toBeDefined()
})

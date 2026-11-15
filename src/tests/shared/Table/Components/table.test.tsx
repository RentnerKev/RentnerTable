import { afterEach, describe, expect, test } from 'bun:test'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react'
import { createRef } from 'react'
import { renderToString } from 'react-dom/server'
import {
    Table,
    createTableColumnHelper,
    getTableMessages,
} from '../../../../index.ts'
import type { TableColumn } from '../../../../index.ts'

afterEach(cleanup)

interface Person {
    id: string
    name: string
    age: number
}
const data: readonly Person[] = [
    { id: 'b', name: 'Bea', age: 35 },
    { id: 'a', name: 'Alex', age: 24 },
    { id: 'c', name: 'Chris', age: 48 },
]
const helper = createTableColumnHelper<Person>()
const columns = helper.columns([
    helper.accessor('name', { header: 'Name' }),
    helper.accessor('age', {
        header: 'Age',
        cell: (cell) => `${cell.getValue()} years`,
    }),
])

function renderedNames() {
    return screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
}

describe('typed table rendering and interactions', () => {
    test('renders native semantics, formatted cells, a caption and a table ref', () => {
        const ref = createRef<HTMLTableElement>()
        render(
            <Table
                ref={ref}
                data={data}
                columns={columns}
                getRowId={(row) => row.id}
                caption="People"
                className="custom-table"
                data-testid="people"
            />,
        )
        expect(screen.getByRole('table', { name: 'People' })).toBe(ref.current)
        expect(screen.getByText('24 years')).toBeDefined()
        expect(screen.getAllByRole('columnheader')).toHaveLength(2)
        expect(ref.current?.classList.contains('custom-table')).toBe(true)
        expect(ref.current?.querySelector('[data-row-id="a"]')).toBeDefined()
    })

    test('sorts ascending, descending and back to the supplied order without mutating data', async () => {
        render(<Table data={data} columns={columns} caption="People" />)
        const name = screen.getByRole('button', { name: /Name/ })
        fireEvent.click(name)
        await waitFor(() =>
            expect(renderedNames()).toEqual(['Alex', 'Bea', 'Chris']),
        )
        expect(
            screen
                .getByRole('columnheader', { name: /Name/ })
                .getAttribute('aria-sort'),
        ).toBe('ascending')
        fireEvent.click(name)
        await waitFor(() =>
            expect(renderedNames()).toEqual(['Chris', 'Bea', 'Alex']),
        )
        expect(
            screen
                .getByRole('columnheader', { name: /Name/ })
                .getAttribute('aria-sort'),
        ).toBe('descending')
        fireEvent.click(name)
        await waitFor(() =>
            expect(renderedNames()).toEqual(['Bea', 'Alex', 'Chris']),
        )
        expect(data.map((person) => person.id)).toEqual(['b', 'a', 'c'])
    })

    test('supports initial sorting and disables sorting when requested', () => {
        const view = render(
            <Table
                data={data}
                columns={columns}
                initialSorting={[{ id: 'age', desc: true }]}
                caption="People"
            />,
        )
        expect(renderedNames()).toEqual(['Chris', 'Bea', 'Alex'])
        view.rerender(
            <Table
                data={data}
                columns={columns}
                enableSorting={false}
                caption="People"
            />,
        )
        expect(screen.queryByRole('button')).toBeNull()
    })

    test('uses current data after a rerender and preserves row identity while sorting', async () => {
        const view = render(
            <Table
                data={data}
                columns={columns}
                getRowId={(row) => row.id}
                caption="People"
            />,
        )
        const alex = screen.getByText('Alex').closest('tr')
        fireEvent.click(screen.getByRole('button', { name: /Name/ }))
        await waitFor(() => expect(renderedNames()[0]).toBe('Alex'))
        expect(screen.getByText('Alex').closest('tr')).toBe(alex)
        view.rerender(
            <Table
                data={[{ id: 'd', name: 'Dana', age: 19 }]}
                columns={columns}
                getRowId={(row) => row.id}
                caption="People"
            />,
        )
        await waitFor(() => expect(renderedNames()).toEqual(['Dana']))
    })

    test('renders grouped headers and spans empty state across leaf columns', () => {
        const grouped: readonly TableColumn<Person>[] = [
            { header: 'Person', columns },
        ]
        const view = render(
            <Table data={data} columns={grouped} caption="People" />,
        )
        expect(
            screen
                .getByRole('columnheader', { name: 'Person' })
                .getAttribute('colspan'),
        ).toBe('2')
        view.rerender(
            <Table data={[]} columns={grouped} caption="People" locale="de" />,
        )
        expect(screen.getByRole('status').textContent).toBe(
            'Keine Einträge vorhanden.',
        )
        expect(screen.getByRole('cell').getAttribute('colspan')).toBe('2')
    })

    test('prioritizes loading and accepts translated messages and custom state content', () => {
        const view = render(
            <Table
                data={data}
                columns={columns}
                isLoading
                locale="de"
                caption="People"
            />,
        )
        expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true')
        expect(screen.getByRole('status').textContent).toBe(
            'Einträge werden geladen …',
        )
        expect(screen.queryByText('Alex')).toBeNull()
        expect(
            screen
                .getAllByRole('button')
                .every((button) => button.hasAttribute('disabled')),
        ).toBe(true)
        view.rerender(
            <Table
                data={[]}
                columns={columns}
                messages={{ empty: 'No people yet' }}
                caption="People"
            />,
        )
        expect(screen.getByRole('status').textContent).toBe('No people yet')
        view.rerender(
            <Table
                data={[]}
                columns={columns}
                emptyState={<a href="/new">Add a person</a>}
                caption="People"
            />,
        )
        expect(screen.getByRole('link', { name: 'Add a person' })).toBeDefined()
    })

    test('server-renders without accessing browser globals and supports custom labels', () => {
        const markup = renderToString(
            <Table
                data={data}
                columns={columns}
                aria-label="People"
                size="sm"
                striped
            />,
        )
        expect(markup).toContain('aria-label="People"')
        expect(markup).toContain('data-size="sm"')
        expect(markup).toContain('Bea')
    })

    test('does not leak mutable message defaults between consumers', () => {
        const messages = getTableMessages('de')
        messages.empty = 'changed'
        expect(getTableMessages('de').empty).toBe('Keine Einträge vorhanden.')
        expect(getTableMessages().sortAscending).toBe('Sort ascending')
    })
})

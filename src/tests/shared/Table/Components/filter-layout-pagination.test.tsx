import { afterEach, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import {
    DataTable,
    TableProvider,
    createTableColumnHelper,
    getTableMessages,
} from '../../../../index.ts'
import { useDataTableLogic } from '../../../../shared/Table/Hooks/useDataTableLogic.ts'
import type { DataTableProps } from '../../../../index.ts'

afterEach(cleanup)

interface Entry {
    id: string
    title: string
}
const data = [{ id: '1', title: 'First' }]
const helper = createTableColumnHelper<Entry>()
const columns = helper.columns([
    helper.accessor('id', {
        header: 'ID',
        meta: { filterClassName: 'w-full sm:w-28' },
    }),
    helper.accessor('title', {
        header: 'Title',
        meta: { filterClassName: 'sm:flex-1' },
    }),
])

function Options(props: Pick<DataTableProps<Entry>, 'locale' | 'messages'>) {
    const { state } = useDataTableLogic({
        data,
        columns,
        pageSize: 7,
        pageSizeOptions: [10, 7, 10],
        ...props,
    })
    return (
        <output data-testid="options">{JSON.stringify(state.pageSizes)}</output>
    )
}

test('page-size labels follow locale and formatter changes without changing numeric values', () => {
    expect(getTableMessages('de').pageSizeOption?.(1)).toBe('1 Zeile')
    expect(getTableMessages('en').pageSizeOption?.(1)).toBe('1 row')
    const { rerender } = render(<Options locale="de" />)
    expect(screen.getByTestId('options').textContent).toBe(
        JSON.stringify([
            { value: 7, label: '7 Zeilen' },
            { value: 10, label: '10 Zeilen' },
        ]),
    )
    rerender(<Options locale="en" />)
    expect(screen.getByTestId('options').textContent).toBe(
        JSON.stringify([
            { value: 7, label: '7 rows' },
            { value: 10, label: '10 rows' },
        ]),
    )
    rerender(
        <Options
            messages={{ pageSizeOption: (count) => `${count} invoices` }}
        />,
    )
    expect(screen.getByTestId('options').textContent).toBe(
        JSON.stringify([
            { value: 7, label: '7 invoices' },
            { value: 10, label: '10 invoices' },
        ]),
    )
})

test('pagination keeps its accessible name and supports restoring the visible label', () => {
    const { container, rerender } = render(
        <DataTable data={data} columns={columns} locale="de" />,
    )
    const label = screen.getByText('Zeilen pro Seite')
    expect(label.classList.contains('sr-only')).toBe(true)
    expect(
        container.querySelector(`[aria-labelledby="${label.id}"]`),
    ).not.toBeNull()
    rerender(
        <DataTable
            data={data}
            columns={columns}
            locale="de"
            classNames={{ pageSizeLabel: 'not-sr-only' }}
        />,
    )
    expect(screen.getByText('Zeilen pro Seite').className).toBe('not-sr-only')
})

test('filter layouts inherit provider slots and retain per-column responsive classes', () => {
    const { container } = render(
        <TableProvider
            classNames={{
                filterGrid: 'flex flex-wrap gap-3',
                filterField: 'm-0 min-w-0',
            }}
        >
            <DataTable
                data={data}
                columns={columns}
                initialShowFilters
                isLoading
            />
        </TableProvider>,
    )
    const id = container.querySelector('fieldset[data-column-id="id"]')
    const title = container.querySelector('fieldset[data-column-id="title"]')
    expect(id?.parentElement?.className).toBe('flex flex-wrap gap-3')
    expect(id?.className).toBe('m-0 min-w-0 w-full sm:w-28')
    expect(title?.className).toBe('m-0 min-w-0 sm:flex-1')
    expect(id?.hasAttribute('disabled')).toBe(true)
    expect(id?.querySelector('legend')?.textContent).toBe('ID')
})

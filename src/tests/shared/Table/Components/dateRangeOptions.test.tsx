import { afterEach, expect, test } from 'bun:test'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react'
import { createTableColumnHelper, DataTable } from '../../../../index.ts'

afterEach(cleanup)

test('applies localized date range options globally and allows a column to override them', async () => {
    const data = [{ joined: '2026-03-10', updated: '2026-03-24' }]
    const helper = createTableColumnHelper<(typeof data)[number]>()
    const columns = helper.columns([
        helper.accessor('joined', {
            header: 'Joined',
            meta: { filter: { type: 'dateRange' } },
        }),
        helper.accessor('updated', {
            header: 'Updated',
            meta: {
                filter: {
                    type: 'dateRange',
                    calendarOptions: {
                        locale: 'en',
                        weekStartsOn: 3,
                        backdrop: true,
                    },
                },
            },
        }),
    ])
    render(
        <DataTable
            data={data}
            columns={columns}
            getRowId={(row) => row.joined}
            locale={{
                code: 'en',
                messages: {
                    calendar: {
                        nextMonth: 'Show next month',
                        previousMonth: 'Show previous month',
                    },
                },
            }}
            messages={{ calendar: { nextMonth: 'Go forward a month' } }}
            dateRangeOptions={{
                locale: 'de',
                weekStartsOn: 7,
                fastEdit: false,
                backdrop: false,
            }}
            initialShowFilters
        />,
    )

    fireEvent.click(
        await screen.findByRole('button', { name: /^Filter Joined:/ }),
    )
    const joinedCalendar = await screen.findByRole('dialog')
    const joined = within(joinedCalendar)
    expect(joinedCalendar.getAttribute('aria-modal')).toBe('false')
    expect(joined.getAllByRole('columnheader')[0]?.textContent).toBe('So')
    expect(joined.queryByRole('combobox')).toBeNull()
    expect(
        joined.getByRole('button', { name: 'Go forward a month' }),
    ).toBeDefined()
    expect(
        joined.getByRole('button', { name: 'Show previous month' }),
    ).toBeDefined()

    fireEvent.keyDown(joinedCalendar, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: /^Filter Updated:/ }))
    const updatedCalendar = await screen.findByRole('dialog')
    const updated = within(updatedCalendar)
    expect(updatedCalendar.getAttribute('aria-modal')).toBe('true')
    expect(updated.getAllByRole('columnheader')[0]?.textContent).toBe('Wed')
    expect(updated.queryByRole('combobox')).toBeNull()
})

import { afterEach, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { TableStatus } from '../../../../shared/Table/Components/TableStatus.tsx'
import {
    getTableMessages,
    resolveTableMessages,
} from '../../../../lib/Messages/tableMessages.ts'

afterEach(cleanup)

test('retains custom no results wording while adding the current filter context', () => {
    const messages = resolveTableMessages('en', {
        noResults: 'Nothing matches',
    })
    expect(messages.noResultsFor?.('Member: test')).toBe(
        'Nothing matches — Member: test',
    )
})

test.each(['en', 'de'] as const)(
    'renders localized filter context in a native table in %s',
    (locale) => {
        render(
            <table>
                <TableStatus
                    view={{
                        columnCount: 3,
                        messages: getTableMessages(locale),
                    }}
                    detailedStates
                    hasFilters
                    filterSummary="Member: test"
                />
            </table>,
        )
        expect(screen.getByRole('status').textContent).toContain(
            locale === 'en'
                ? 'No results found for Member: test'
                : 'Keine Ergebnisse gefunden für Member: test',
        )
        expect(screen.getByRole('cell').getAttribute('colspan')).toBe('3')
    },
)

test('keeps custom no results content ahead of the generated summary', () => {
    render(
        <table>
            <TableStatus
                view={{ columnCount: 1, messages: getTableMessages('en') }}
                detailedStates
                hasFilters
                filterSummary="Member: test"
                noResultsState={<span>Custom result content</span>}
            />
        </table>,
    )
    expect(screen.getByRole('status').textContent).toBe('Custom result content')
    expect(screen.queryByText(/Member: test/)).toBeNull()
})

test('supports existing full message objects without contextual messages', () => {
    const messages = getTableMessages('en')
    delete messages.noResultsFor
    render(
        <table>
            <TableStatus
                view={{ columnCount: 1, messages }}
                detailedStates
                hasFilters
                filterSummary="Member: test"
            />
        </table>,
    )
    expect(screen.getByRole('status').textContent).toContain('No results found')
})

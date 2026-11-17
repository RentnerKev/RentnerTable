import { expect, test } from 'bun:test'
import {
    getTableLocale,
    resolveTableMessages,
} from '../../../lib/Messages/tableMessages.ts'

test('merges nested locale messages with defined legacy overrides', () => {
    const locale = {
        code: 'de',
        messages: {
            search: 'Personen suchen',
            filters: 'Personen filtern',
            columnSettings: { title: 'Spalten anpassen', apply: 'Übernehmen' },
            calendar: { nextMonth: 'Monat vor', previousMonth: 'Monat zurück' },
        },
    } as const
    const messages = resolveTableMessages(locale, {
        search: undefined,
        filters: 'Auswahl filtern',
        columnSettings: { title: undefined, apply: 'Speichern' },
        calendar: { nextMonth: 'Weiter', previousMonth: undefined },
    })

    expect(getTableLocale()).toBe('en')
    expect(getTableLocale(locale)).toBe('de')
    expect(messages.search).toBe('Personen suchen')
    expect(messages.filters).toBe('Auswahl filtern')
    expect(messages.sortAscending).toBe('Aufsteigend sortieren')
    expect(messages.columnSettings).toEqual({
        title: 'Spalten anpassen',
        apply: 'Speichern',
    })
    expect(messages.calendar).toEqual({
        nextMonth: 'Weiter',
        previousMonth: 'Monat zurück',
    })
})

test('uses the effective no-results title unless a contextual message is supplied', () => {
    const messages = resolveTableMessages(
        { code: 'en', messages: { noResults: 'No people found' } },
        { noResults: 'No matches' },
    )
    expect(messages.noResultsFor?.('City: Bonn')).toBe(
        'No matches — City: Bonn',
    )

    const customMessages = resolveTableMessages(
        {
            code: 'en',
            messages: {
                noResultsFor: (summary) => `No matching people for ${summary}`,
            },
        },
        { noResults: 'No matches', noResultsFor: undefined },
    )
    expect(customMessages.noResultsFor?.('City: Bonn')).toBe(
        'No matching people for City: Bonn',
    )
})

test('formats the footer row label with the locale and honors explicit formatters', () => {
    expect(resolveTableMessages('en').rowRange(1, 10, 23)).toBe(
        '1–10 of 23 entries',
    )
    expect(resolveTableMessages('de').rowRange(1, 10, 23)).toBe(
        '1–10 von 23 Einträgen',
    )
    const messages = resolveTableMessages({ code: 'de' }, undefined, 'Artikel')
    expect(messages.rowRange(1, 10, 23)).toBe('1–10 von 23 Artikel')
    expect(messages.rowRange(1, 10, null)).toBe('1–10 Artikel')

    const locale = {
        code: 'en',
        messages: { rowRange: () => 'People' },
    } as const
    expect(
        resolveTableMessages(locale, undefined, 'members').rowRange(1, 10, 23),
    ).toBe('People')
    expect(
        resolveTableMessages(
            locale,
            { rowRange: () => 'Team members' },
            'members',
        ).rowRange(1, 10, 23),
    ).toBe('Team members')
})

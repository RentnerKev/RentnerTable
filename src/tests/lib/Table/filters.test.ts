import { describe, expect, test } from 'bun:test'
import {
    tableDateRangeFilter,
    tableEqualsFilter,
    tableTextFilter,
} from '../../../index.ts'

const row = (value: unknown) => ({ getValue: () => value })

describe('portable table filters', () => {
    test('trims and normalizes search while preserving scalar zero and false values', () => {
        expect(tableTextFilter(row('Kevin Sträßler'), 'name', ' KEVIN ')).toBe(
            true,
        )
        expect(tableTextFilter(row(0), 'value', '0')).toBe(true)
        expect(tableTextFilter(row(false), 'value', 'false')).toBe(true)
        expect(
            tableTextFilter(row({ secret: 'not searched' }), 'value', 'secret'),
        ).toBe(false)
        expect(tableTextFilter(row(new Date('invalid')), 'value', 'NaN')).toBe(
            false,
        )
        expect(tableTextFilter.autoRemove('   ')).toBe(true)
        expect(tableEqualsFilter(row(false), 'value', 'false')).toBe(true)
        expect(tableEqualsFilter(row('Developer'), 'value', 'Dev')).toBe(false)
        expect(tableEqualsFilter.autoRemove(false)).toBe(false)
    })

    test('includes the entire local final date and accepts open-ended date ranges', () => {
        const lastMillisecond = new Date(2026, 10, 15, 23, 59, 59, 999)
        const range = { from: '2026-11-15', to: '2026-11-15' }
        expect(tableDateRangeFilter(row(lastMillisecond), 'date', range)).toBe(
            true,
        )
        expect(
            tableDateRangeFilter(row(new Date(2026, 10, 16)), 'date', range),
        ).toBe(false)
        expect(tableDateRangeFilter(row('2026-11-15'), 'date', range)).toBe(
            true,
        )
        expect(
            tableDateRangeFilter(row(lastMillisecond.getTime()), 'date', {
                from: '2026-11-15',
            }),
        ).toBe(true)
        expect(
            tableDateRangeFilter(row(lastMillisecond), 'date', {
                to: '2026-11-15',
            }),
        ).toBe(true)
        expect(tableDateRangeFilter.autoRemove({ from: '', to: '' })).toBe(true)
    })

    test('rejects impossible dates, invalid records and reversed ranges without throwing', () => {
        for (const range of [
            { from: '2026-02-31' },
            { to: 'invalid' },
            { from: '2026-11-16', to: '2026-11-15' },
        ])
            expect(tableDateRangeFilter(row('2026-11-15'), 'date', range)).toBe(
                false,
            )
        for (const value of [null, {}, false, new Date('invalid'), 'invalid'])
            expect(
                tableDateRangeFilter(row(value), 'date', {
                    from: '2026-11-15',
                }),
            ).toBe(false)
    })

    test('preserves portable filter behavior when TanStack prepares a query once for many rows', () => {
        const search = ' KEVIN '
        const preparedSearch = tableTextFilter.resolveFilterValue(search)
        for (const value of [
            'Kevin Sträßler',
            'Alex',
            false,
            0,
            new Date('invalid'),
        ])
            expect(tableTextFilter(row(value), 'value', preparedSearch)).toBe(
                tableTextFilter(row(value), 'value', search),
            )
        for (const range of [
            { from: '2026-11-15', to: '2026-11-15' },
            { to: '2026-11-15' },
            { from: '2026-02-31' },
            { from: '2026-11-16', to: '2026-11-15' },
        ]) {
            const preparedRange = tableDateRangeFilter.resolveFilterValue(range)
            for (const value of [
                '2026-11-15',
                new Date(2026, 10, 15, 23, 59, 59, 999),
                '2026-11-16',
                'invalid',
                null,
            ])
                expect(
                    tableDateRangeFilter(row(value), 'date', preparedRange),
                ).toBe(tableDateRangeFilter(row(value), 'date', range))
        }
    })
})

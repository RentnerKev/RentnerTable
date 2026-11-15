import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, renderHook } from '@testing-library/react'
import { createTableColumnHelper, useDataTableLogic } from '../../../index.ts'
import { getTableFilterSummary } from '../../../lib/Table/filterSummary.ts'
import { getTableMessages } from '../../../lib/Messages/tableMessages.ts'
import type { TableLocale } from '../../../shared/Table/Types/table.types.ts'

afterEach(cleanup)

interface Member {
    id: string
    name: string
    role: string
    joined: string
    custom: string
}
const helper = createTableColumnHelper<Member>()
const columns = helper.columns([
    helper.accessor('name', { header: 'Member' }),
    helper.accessor('role', {
        header: 'Role',
        meta: {
            filter: {
                type: 'select',
                options: [{ value: 'dev', label: 'Developer' }],
            },
        },
    }),
    helper.accessor('joined', {
        header: 'Joined',
        meta: { filter: { type: 'dateRange' } },
    }),
    helper.accessor('custom', {
        header: 'Custom',
        meta: { filter: { type: 'custom', render: () => null } },
    }),
])
const data: Member[] = []
const getRowId = (row: Member) => row.id

describe('filter context', () => {
    test.each(['en', 'de'] as const)(
        'formats search, select labels and dates in %s',
        (locale: TableLocale) => {
            const messages = getTableMessages(locale)
            const { result } = renderHook(() =>
                useDataTableLogic({
                    data,
                    columns,
                    getRowId,
                    locale,
                    tableOptions: {
                        initialState: {
                            columnFilters: [
                                { id: 'name', value: ' test ' },
                                { id: 'role', value: 'dev' },
                                {
                                    id: 'joined',
                                    value: {
                                        from: '2026-11-15',
                                        to: '2026-11-16',
                                    },
                                },
                            ],
                        },
                    },
                }),
            )
            const summary = getTableFilterSummary(
                result.current.table,
                ' query ',
                locale,
                messages,
            )
            expect(summary).toBe(
                locale === 'en'
                    ? 'Search table: query; Member: test; Role: Developer; Joined: 11/15/2026 – 11/16/2026'
                    : 'Tabelle durchsuchen: query; Member: test; Role: Developer; Joined: 15.11.2026 – 16.11.2026',
            )
        },
    )

    test('keeps custom filter context without coercing arbitrary values', () => {
        const value = {
            toString() {
                throw new Error('must not stringify')
            },
        }
        const { result } = renderHook(() =>
            useDataTableLogic({
                data,
                columns,
                getRowId,
                tableOptions: {
                    initialState: {
                        columnFilters: [
                            { id: 'custom', value },
                            { id: 'joined', value: { from: '2026-02-31' } },
                        ],
                    },
                },
            }),
        )
        expect(
            getTableFilterSummary(
                result.current.table,
                value,
                'en',
                getTableMessages('en'),
            ),
        ).toBe('Custom; Joined')
    })

    test('formats open date ranges and scalar custom values', () => {
        const { result } = renderHook(() =>
            useDataTableLogic({
                data,
                columns,
                getRowId,
                tableOptions: {
                    initialState: {
                        columnFilters: [
                            { id: 'joined', value: { to: '2026-11-15' } },
                            { id: 'custom', value: false },
                        ],
                    },
                },
            }),
        )
        expect(
            getTableFilterSummary(
                result.current.table,
                '',
                'de',
                getTableMessages('de'),
            ),
        ).toBe('Joined: ≤ 15.11.2026; Custom: false')
    })
})

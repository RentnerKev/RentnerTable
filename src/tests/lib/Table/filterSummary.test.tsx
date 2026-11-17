import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { createTableColumnHelper, useDataTableLogic } from '../../../index.ts'
import { getTableFilterSummary } from '../../../lib/Table/filterSummary.ts'
import { getTableSelectOptions } from '../../../lib/Table/presentation.ts'
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
    test('derives sorted select options from all unfiltered rows and clears array filters', async () => {
        const rows = [
            { id: '1', role: 'dev', tags: ['beta', 'api', 'api', ''] },
            { id: '2', role: 'admin', tags: ['api-client', 'beta'] },
            { id: '3', role: 'dev', tags: ['docs', 'api'] },
            { id: '4', role: '', tags: 'api' },
        ]
        type SelectRow = (typeof rows)[number]
        const getRole = mock((row: SelectRow) => row.role)
        const selectHelper = createTableColumnHelper<SelectRow>()
        const selectColumns = selectHelper.columns([
            selectHelper.accessor(getRole, {
                id: 'role',
                header: 'Role',
                sortDescFirst: false,
                meta: { filter: { type: 'select' } },
            }),
            selectHelper.accessor((member) => member.tags, {
                id: 'tags',
                header: 'Tags',
                meta: { filter: { type: 'select', match: 'includes' } },
            }),
        ])
        const { result, rerender } = renderHook(
            ({ members }) =>
                useDataTableLogic({
                    data: members,
                    columns: selectColumns,
                    getRowId: (row) => row.id,
                    pageSize: 1,
                    tableOptions: {
                        initialState: {
                            columnFilters: [{ id: 'tags', value: 'api' }],
                        },
                    },
                }),
            { initialProps: { members: rows } },
        )
        const table = result.current.table
        const role = table.getColumn('role')
        const tags = table.getColumn('tags')
        if (!role || !tags) throw new Error('Expected select columns')

        expect(table.getFilteredRowModel().rows.map((row) => row.id)).toEqual([
            '1',
            '3',
        ])
        expect(result.current.state.filterSummary).toBe('Tags: api')
        expect(getRole).not.toHaveBeenCalled()
        expect(getTableSelectOptions(role)).toEqual([
            { value: 'admin', label: 'admin' },
            { value: 'dev', label: 'dev' },
        ])
        const options = getTableSelectOptions(tags)
        expect(options.map((item) => item.value)).toEqual([
            'api',
            'api-client',
            'beta',
            'docs',
        ])

        await act(async () => {
            tags.setFilterValue('')
        })
        expect(result.current.table.state.columnFilters).toEqual([])
        expect(table.getFilteredRowModel().rows).toHaveLength(4)
        expect(getTableSelectOptions(tags)).toBe(options)

        rerender({ members: [{ id: '5', role: 'dev', tags: ['new'] }] })
        const updatedTags = result.current.table.getColumn('tags')
        if (!updatedTags) throw new Error('Expected tags column')
        expect(getTableSelectOptions(updatedTags)).toEqual([
            { value: 'new', label: 'new' },
        ])
    })

    test('keeps explicit select labels and custom filter functions for array columns', () => {
        const rows = [
            { id: '1', tags: ['api'] },
            { id: '2', tags: ['ui'] },
        ]
        const selectHelper = createTableColumnHelper<(typeof rows)[number]>()
        const options = [{ value: 'api', label: 'API' }] as const
        const selectColumns = selectHelper.columns([
            selectHelper.accessor('tags', {
                header: 'Tags',
                filterFn: (row) => row.original.id === '2',
                meta: {
                    filter: { type: 'select', match: 'includes', options },
                },
            }),
        ])
        const { result } = renderHook(() =>
            useDataTableLogic({
                data: rows,
                columns: selectColumns,
                getRowId: (row) => row.id,
                tableOptions: {
                    initialState: {
                        columnFilters: [{ id: 'tags', value: 'api' }],
                    },
                },
            }),
        )
        const column = result.current.table.getColumn('tags')
        if (!column) throw new Error('Expected tags column')
        expect(getTableSelectOptions(column)).toBe(options)
        expect(result.current.state.rows.map((row) => row.id)).toEqual(['2'])
        expect(result.current.state.filterSummary).toBe('Tags: API')
    })

    test('does not read the select accessor for a closed manually filtered table', () => {
        const rows = [{ id: '1', tags: ['api'] }]
        type SelectRow = (typeof rows)[number]
        const getTags = mock((row: SelectRow) => row.tags)
        const selectHelper = createTableColumnHelper<SelectRow>()
        const selectColumns = selectHelper.columns([
            selectHelper.accessor(getTags, {
                id: 'tags',
                header: 'Tags',
                sortDescFirst: false,
                meta: { filter: { type: 'select', match: 'includes' } },
            }),
        ])
        const { result } = renderHook(() =>
            useDataTableLogic({
                data: rows,
                columns: selectColumns,
                getRowId: (row) => row.id,
                tableOptions: {
                    manualFiltering: true,
                    initialState: {
                        columnFilters: [{ id: 'tags', value: 'docs' }],
                    },
                },
            }),
        )
        expect(result.current.state.showFilters).toBe(false)
        expect(result.current.state.rows.map((row) => row.id)).toEqual(['1'])
        expect(result.current.state.filterSummary).toBe('Tags: docs')
        expect(getTags).not.toHaveBeenCalled()
    })

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

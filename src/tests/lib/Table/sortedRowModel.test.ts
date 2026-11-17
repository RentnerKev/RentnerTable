import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { createSortedRowModel, sortFns, useTable } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import {
    createTableColumnHelper,
    rentnerTableFeatures,
} from '../../../lib/Table/table.ts'

interface Item {
    id: string
    value: unknown
    secondary?: string
    date?: unknown
    nested?: { secondary: string }
    children?: Item[]
}

const helper = createTableColumnHelper<Item>()
const getRowId = (row: Item) => row.id
const getSubRows = (row: Item) => row.children
const originalFeatures = {
    ...rentnerTableFeatures,
    sortedRowModel: createSortedRowModel(),
}
const custom = Object.assign(
    (
        left: { getValue: (id: string) => unknown },
        right: { getValue: (id: string) => unknown },
    ) =>
        String(left.getValue('custom')).length -
        String(right.getValue('custom')).length,
    {
        sort: sortFns.alphanumeric.sort,
        resolveDataValue: sortFns.alphanumeric.resolveDataValue,
    },
)

afterEach(cleanup)

describe('materialized sorted row model', () => {
    test('matches the native pipeline for built-ins, undefined policies, inversion and multisort', () => {
        const values: unknown[] = [
            undefined,
            null,
            'a02',
            'a2',
            'A2',
            'a10',
            'a1b2c3',
            'a1',
            'ä2',
            '',
            true,
            2n,
            'x9007199254740992',
            'x9007199254740993',
            `x${'9'.repeat(320)}`,
        ]
        const fixtures = [
            ...(
                [
                    'text',
                    'textCaseSensitive',
                    'alphanumeric',
                    'alphanumericCaseSensitive',
                    'auto',
                ] as const
            ).map((name) => ({ name, values })),
            {
                name: 'basic' as const,
                values: [undefined, 2, -1, Infinity, -Infinity, 0, -0, 2],
            },
            {
                name: 'basic' as const,
                values: [undefined, 2, NaN, null, '2', 1, false],
            },
            {
                name: 'datetime' as const,
                values: [
                    undefined,
                    new Date(0),
                    new Date(100),
                    50,
                    new Date(-100),
                ],
            },
            {
                name: 'datetime' as const,
                values: [new Date('invalid'), null, '2026-01-01', 0],
            },
        ]
        for (const fixture of fixtures) {
            const data: Item[] = fixture.values.map((value, index) => ({
                id: String(index),
                value,
                secondary: `group${index % 3}`,
            }))
            for (const sortUndefined of [
                false,
                -1,
                1,
                'first',
                'last',
            ] as const) {
                for (const desc of [false, true]) {
                    for (const invertSorting of [false, true]) {
                        const columns = helper.columns([
                            helper.accessor('value', {
                                sortFn: fixture.name,
                                sortUndefined,
                                invertSorting,
                            }),
                            helper.accessor('secondary', { sortFn: 'text' }),
                        ])
                        const options = {
                            data,
                            columns,
                            getRowId,
                            initialState: {
                                sorting: [
                                    { id: 'value', desc },
                                    { id: 'secondary', desc: !desc },
                                ],
                            },
                        }
                        const { result, unmount } = renderHook(() => ({
                            native: useTable({
                                ...options,
                                features: originalFeatures,
                            }),
                            fast: useTable({
                                ...options,
                                features: rentnerTableFeatures,
                            }),
                        }))
                        const native = result.current.native.getSortedRowModel()
                        const fast = result.current.fast.getSortedRowModel()
                        expect(fast.rows.map((row) => row.id)).toEqual(
                            native.rows.map((row) => row.id),
                        )
                        expect(fast.flatRows.map((row) => row.id)).toEqual(
                            native.flatRows.map((row) => row.id),
                        )
                        expect(fast.rowsById).toBe(
                            result.current.fast.getPreSortedRowModel().rowsById,
                        )
                        expect(fast.rows).not.toBe(fast.flatRows)
                        expect(result.current.fast.getSortedRowModel()).toBe(
                            fast,
                        )
                        unmount()
                    }
                }
            }
        }
    })

    test('matches seeded text and natural sorting with numeric and UTF-16 edge cases', () => {
        let seed = 0x714ac0de
        const next = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            return seed
        }
        const alphabet = [
            'a',
            'A',
            'z',
            '0',
            '2',
            '9',
            '-',
            '_',
            '.',
            ' ',
            'ä',
            'Ö',
            'ß',
            'İ',
            'ı',
            'é',
            '\u0301',
            '😀',
            '\ud800',
            '\udc00',
            '١',
            '９',
        ]
        const values: unknown[] = [
            '',
            '0',
            '00',
            '000000000000000',
            'item2',
            'item02',
            'item0002',
            'item10',
            'a1',
            'a1b',
            'a1b2',
            'a1b2c3',
            'a1b2c3d4',
            'a1b02',
            'A1B2',
            'x999999999999999',
            'x1000000000000000',
            'x9999999999999999',
            'x9007199254740992',
            'x9007199254740993',
            'x10000000000000000',
            `x${'9'.repeat(320)}`,
            `x${'8'.repeat(320)}`,
            `x${'9'.repeat(320)}a1`,
            `x${'8'.repeat(320)}a2`,
            `x${'0'.repeat(400)}1`,
            'item-2',
            'item-10',
            'item1.2',
            'item1.02',
            'İ1',
            'i\u03071',
            '😀12',
            '😀2',
            '\ud8002',
            '\udc002',
            '١2',
            '９2',
            0,
            -0,
            1e21,
            Number.MAX_VALUE,
            Infinity,
            -Infinity,
            NaN,
            null,
            undefined,
        ]
        for (let index = 0; index < 300; index++) {
            let value = ''
            const length = next() % 80
            for (let position = 0; position < length; position++)
                value += alphabet[next() % alphabet.length]
            values.push(value)
        }
        const data: Item[] = values.map((value, index) => ({
            id: String(index),
            value,
        }))
        for (const name of [
            'text',
            'textCaseSensitive',
            'alphanumeric',
            'alphanumericCaseSensitive',
        ] as const) {
            for (const desc of [false, true]) {
                const columns = helper.columns([
                    helper.accessor('value', { sortFn: name }),
                ])
                const options = {
                    data,
                    columns,
                    getRowId,
                    initialState: { sorting: [{ id: 'value', desc }] },
                }
                const { result, unmount } = renderHook(() => ({
                    native: useTable({
                        ...options,
                        features: originalFeatures,
                    }),
                    fast: useTable({
                        ...options,
                        features: rentnerTableFeatures,
                    }),
                }))
                expect(
                    result.current.fast
                        .getSortedRowModel()
                        .rows.map((row) => row.id),
                ).toEqual(
                    result.current.native
                        .getSortedRowModel()
                        .rows.map((row) => row.id),
                )
                unmount()
            }
        }
    })
    test('preserves nested rows, arbitrary comparators with metadata, custom accessors and manual sorting', () => {
        const data: Item[] = [
            {
                id: 'first',
                value: 'long value10',
                children: [
                    { id: 'child1', value: 'a10' },
                    { id: 'child2', value: 'a2' },
                ],
            },
            { id: 'second', value: 'a2' },
        ]
        for (const nested of [false, true]) {
            for (const manualSorting of [false, true]) {
                const columns = helper.columns([
                    helper.accessor('value', {
                        id: 'builtin',
                        sortFn: 'alphanumeric',
                    }),
                    helper.accessor('value', { id: 'custom', sortFn: custom }),
                    helper.accessor((row) => row.value, {
                        id: 'accessor',
                        sortFn: 'alphanumeric',
                    }),
                ])
                for (const id of ['builtin', 'custom', 'accessor']) {
                    const options = {
                        data,
                        columns,
                        getRowId,
                        getSubRows: nested ? getSubRows : undefined,
                        manualSorting,
                        initialState: { sorting: [{ id, desc: false }] },
                    }
                    const { result, unmount } = renderHook(() => ({
                        native: useTable({
                            ...options,
                            features: originalFeatures,
                        }),
                        fast: useTable({
                            ...options,
                            features: rentnerTableFeatures,
                        }),
                    }))
                    expect(
                        result.current.fast
                            .getSortedRowModel()
                            .flatRows.map((row) => row.id),
                    ).toEqual(
                        result.current.native
                            .getSortedRowModel()
                            .flatRows.map((row) => row.id),
                    )
                    if (manualSorting)
                        expect(result.current.fast.getSortedRowModel()).toBe(
                            result.current.fast.getPreSortedRowModel(),
                        )
                    unmount()
                }
            }
        }
    })

    test('falls back for row-level custom getValue methods without changing read counts', () => {
        const data: Item[] = Array.from({ length: 24 }, (_, index) => ({
            id: String(index),
            value: `item${24 - index}`,
        }))
        const columns = helper.columns([
            helper.accessor('value', { sortFn: 'alphanumeric' }),
        ])
        const options = {
            data,
            columns,
            getRowId,
            initialState: { sorting: [{ id: 'value', desc: false }] },
        }
        const { result } = renderHook(() => ({
            native: useTable({ ...options, features: originalFeatures }),
            fast: useTable({ ...options, features: rentnerTableFeatures }),
        }))
        const counts = { native: 0, fast: 0 }
        for (const name of ['native', 'fast'] as const) {
            const row = result.current[name].getCoreRowModel().rows[0]
            const original = row.getValue.bind(row)
            row.getValue = <TValue>(id: string): TValue => {
                counts[name]++
                return original<TValue>(id)
            }
        }
        expect(
            result.current.fast.getSortedRowModel().rows.map((row) => row.id),
        ).toEqual(
            result.current.native.getSortedRowModel().rows.map((row) => row.id),
        )
        expect(counts.fast).toBe(counts.native)
    })

    test('keeps singleton getters unread as native sorting does', () => {
        let reads = 0
        const data: Item[] = [
            {
                id: 'only',
                get value() {
                    reads++
                    throw new Error('unexpected singleton getter')
                },
            },
        ]
        const columns = helper.columns([
            helper.accessor('value', { sortFn: 'basic' }),
        ])
        const options = {
            data,
            columns,
            getRowId,
            initialState: { sorting: [{ id: 'value', desc: false }] },
        }
        const { result } = renderHook(() => ({
            native: useTable({ ...options, features: originalFeatures }),
            fast: useTable({ ...options, features: rentnerTableFeatures }),
        }))
        expect(
            result.current.native.getSortedRowModel().rows.map((row) => row.id),
        ).toEqual(['only'])
        expect(
            result.current.fast.getSortedRowModel().rows.map((row) => row.id),
        ).toEqual(['only'])
        expect(reads).toBe(0)
    })

    test('leaves unused getter, inherited and deep secondary keys unread', () => {
        for (const kind of ['getter', 'inherited', 'deep'] as const) {
            let reads = 0
            const fail = () => {
                reads++
                throw new Error(`unexpected ${kind} getter`)
            }
            const data: Item[] = [2, 1, 3].map((value) => {
                const row: Item = { id: String(value), value }
                if (kind === 'getter')
                    Object.defineProperty(row, 'secondary', { get: fail })
                if (kind === 'inherited')
                    Object.setPrototypeOf(
                        row,
                        Object.defineProperty({}, 'secondary', { get: fail }),
                    )
                if (kind === 'deep')
                    row.nested = {
                        get secondary() {
                            return fail()
                        },
                    }
                return row
            })
            const columns = helper.columns([
                helper.accessor('value', { sortFn: 'basic' }),
                kind === 'deep'
                    ? helper.accessor('nested.secondary', {
                          id: 'secondary',
                          sortFn: 'text',
                      })
                    : helper.accessor('secondary', { sortFn: 'text' }),
            ])
            const options = {
                data,
                columns,
                getRowId,
                initialState: {
                    sorting: [
                        { id: 'value', desc: false },
                        { id: 'secondary', desc: false },
                    ],
                },
            }
            const { result, unmount } = renderHook(() => ({
                native: useTable({ ...options, features: originalFeatures }),
                fast: useTable({ ...options, features: rentnerTableFeatures }),
            }))
            expect(
                result.current.fast
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(
                result.current.native
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            )
            expect(reads).toBe(0)
            unmount()
        }
    })

    test('checks later custom sorts before preparing any accessor keys', () => {
        const events = { native: [] as string[], fast: [] as string[] }
        const makeData = (name: 'native' | 'fast'): Item[] =>
            [2, 1, 3].map((value) => ({
                id: String(value),
                get value() {
                    events[name].push(String(value))
                    return value
                },
                secondary: String(value),
            }))
        const nativeData = makeData('native')
        const fastData = makeData('fast')
        const columns = helper.columns([
            helper.accessor('value', { sortFn: 'basic' }),
            helper.accessor('secondary', { id: 'custom', sortFn: custom }),
        ])
        const options = {
            columns,
            getRowId,
            initialState: {
                sorting: [
                    { id: 'value', desc: false },
                    { id: 'custom', desc: false },
                ],
            },
        }
        const { result } = renderHook(() => ({
            native: useTable({
                ...options,
                data: nativeData,
                features: originalFeatures,
            }),
            fast: useTable({
                ...options,
                data: fastData,
                features: rentnerTableFeatures,
            }),
        }))
        expect(
            result.current.fast.getSortedRowModel().rows.map((row) => row.id),
        ).toEqual(
            result.current.native.getSortedRowModel().rows.map((row) => row.id),
        )
        expect(events.fast).toEqual(events.native)
    })

    test('leaves unused Date getTime getters and fake Date secondary keys untouched', () => {
        for (const kind of ['getter', 'throwingGetter', 'fake'] as const) {
            let reads = 0
            const date =
                kind === 'fake' ? Object.create(Date.prototype) : new Date(0)
            if (kind !== 'fake')
                Object.defineProperty(date, 'getTime', {
                    get: () => {
                        reads++
                        if (kind === 'throwingGetter')
                            throw new Error('unused getTime getter')
                        return Date.prototype.getTime
                    },
                })
            const data: Item[] = [
                { id: 'second', value: 2, date },
                { id: 'first', value: 1, date },
            ]
            const columns = helper.columns([
                helper.accessor('value', { sortFn: 'basic' }),
                helper.accessor('date', { sortFn: 'datetime' }),
            ])
            const options = {
                data,
                columns,
                getRowId,
                initialState: {
                    sorting: [
                        { id: 'value', desc: false },
                        { id: 'date', desc: false },
                    ],
                },
            }
            const { result, unmount } = renderHook(() => ({
                native: useTable({ ...options, features: originalFeatures }),
                fast: useTable({ ...options, features: rentnerTableFeatures }),
            }))
            expect(
                result.current.native
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(['first', 'second'])
            expect(
                result.current.fast
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(['first', 'second'])
            expect(reads).toBe(0)
            unmount()
        }
    })
    test('falls back when proxy descriptors throw but normal property reads work', () => {
        const data: Item[] = [2, 1].map(
            (value) =>
                new Proxy(
                    { id: String(value), value },
                    {
                        getOwnPropertyDescriptor: () => {
                            throw new Error('descriptor unavailable')
                        },
                    },
                ),
        )
        const columns = helper.columns([
            helper.accessor('value', { sortFn: 'basic' }),
        ])
        const options = {
            data,
            columns,
            getRowId,
            initialState: { sorting: [{ id: 'value', desc: false }] },
        }
        const { result } = renderHook(() => ({
            native: useTable({ ...options, features: originalFeatures }),
            fast: useTable({ ...options, features: rentnerTableFeatures }),
        }))
        expect(
            result.current.fast.getSortedRowModel().rows.map((row) => row.id),
        ).toEqual(
            result.current.native.getSortedRowModel().rows.map((row) => row.id),
        )
    })

    test('recognizes built-ins by captured identity after registry reassignment', () => {
        const original = sortFns.alphanumeric
        try {
            sortFns.alphanumeric = sortFns.text
            const data: Item[] = [
                { id: 'two', value: 'a2' },
                { id: 'ten', value: 'a10' },
            ]
            const columns = helper.columns([
                helper.accessor('value', { sortFn: 'alphanumeric' }),
            ])
            const options = {
                data,
                columns,
                getRowId,
                initialState: { sorting: [{ id: 'value', desc: false }] },
            }
            const { result } = renderHook(() => ({
                native: useTable({ ...options, features: originalFeatures }),
                fast: useTable({ ...options, features: rentnerTableFeatures }),
            }))
            expect(
                result.current.fast
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(['ten', 'two'])
            expect(
                result.current.fast
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(
                result.current.native
                    .getSortedRowModel()
                    .rows.map((row) => row.id),
            )
        } finally {
            sortFns.alphanumeric = original
        }
    })
    test.each(['builtin', 'custom'])(
        'matches deferred reset ownership when initially using %s',
        async (initial) => {
            const data: Item[] = [
                { id: '1', value: 'item10' },
                { id: '2', value: 'item2' },
            ]
            const columns = helper.columns([
                helper.accessor('value', {
                    id: 'builtin',
                    sortFn: 'alphanumeric',
                }),
                helper.accessor('value', { id: 'custom', sortFn: custom }),
            ])
            const a: SortingState = [{ id: initial, desc: false }]
            const b: SortingState = [
                {
                    id: initial === 'builtin' ? 'custom' : 'builtin',
                    desc: false,
                },
            ]
            const c: SortingState = [{ id: 'custom', desc: true }]
            const { result, rerender } = renderHook(
                ({ sorting }: { sorting: SortingState }) => ({
                    native: useTable({
                        features: originalFeatures,
                        data,
                        columns,
                        getRowId,
                        state: { sorting },
                        autoResetPageIndex: true,
                    }),
                    fast: useTable({
                        features: rentnerTableFeatures,
                        data,
                        columns,
                        getRowId,
                        state: { sorting },
                        autoResetPageIndex: true,
                    }),
                }),
                { initialProps: { sorting: a } },
            )
            const counts = { native: 0, fast: 0 }
            for (const name of ['native', 'fast'] as const) {
                const table =
                    result.current[name].getCoreRowModel().rows[0].table
                table.autoResetPageIndex = () => {
                    counts[name]++
                }
                result.current[name].getSortedRowModel()
            }
            await act(async () => {
                await Promise.resolve()
            })
            expect(counts).toEqual({ native: 0, fast: 0 })
            // Reuse old references after changing mode, before deferred callbacks run.
            for (const sorting of [b, a, b, c, a]) {
                rerender({ sorting })
                result.current.native.getSortedRowModel()
                result.current.fast.getSortedRowModel()
            }
            await act(async () => {
                await Promise.resolve()
            })
            expect(counts.native).toBe(5)
            expect(counts.fast).toBe(counts.native)
            result.current.fast.getSortedRowModel()
            await act(async () => {
                await Promise.resolve()
            })
            expect(counts.fast).toBe(5)
        },
    )
})

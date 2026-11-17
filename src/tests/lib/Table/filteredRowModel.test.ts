/* eslint-disable no-underscore-dangle -- Guarded TanStack compatibility requires upstream member names. */
import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import {
    columnFilteringFeature,
    createCoreRowModel,
    createFilteredRowModel,
    useTable,
} from '@tanstack/react-table'
import type { ColumnFiltersState, FilterFn } from '@tanstack/react-table'
import { createCoordinatedFilteredRowModels } from '../../../lib/Table/filteredRowModel.ts'
import {
    createTableColumnHelper,
    rentnerTableFeatures,
} from '../../../lib/Table/table.ts'

interface Item {
    id: string
    value: string | number | boolean
    nested?: { value: string }
    children?: Item[]
}

const helper = createTableColumnHelper<Item>()
const data: Item[] = [
    { id: 'a', value: 'Alpha', nested: { value: 'Alpha' } },
    { id: 'b', value: 'Beta', nested: { value: 'Beta' } },
]
const getRowId = (row: Item) => row.id
const columns = helper.columns([helper.accessor('value', { filterFn: 'text' })])
const nativeFeatures = {
    ...rentnerTableFeatures,
    coreRowModel: createCoreRowModel(),
    filteredRowModel: createFilteredRowModel(),
}
const fastFeatures = {
    ...rentnerTableFeatures,
    ...createCoordinatedFilteredRowModels(),
}
const features = { native: nativeFeatures, fast: fastFeatures }

const metadataFilter: FilterFn<typeof rentnerTableFeatures, Item> = (
    row,
    id,
    value,
    addMeta,
) => {
    addMeta({ value: row.getValue(id) })
    return row.getValue(id) === value
}
const equalityFilter: FilterFn<typeof rentnerTableFeatures, Item> = (
    row,
    id,
    value,
) => row.getValue(id) === value

afterEach(cleanup)

describe('coordinated filtered row models', () => {
    test('allocates exactly two fewer metadata maps per initially owned row', () => {
        const { result } = renderHook(() => ({
            native: useTable({
                features: nativeFeatures,
                data,
                columns,
                getRowId,
            }),
            fast: useTable({ features: fastFeatures, data, columns, getRowId }),
        }))
        // Installed 9.3.1 makeObjectMap is Object.create(null). Spy at that
        // primitive so native initializer identities and module bindings stay intact.
        const create = Object.create
        let count = 0
        const allocations = { native: 0, fast: 0 }
        const spy = spyOn(Object, 'create').mockImplementation(
            (prototype: object | null, descriptors?: PropertyDescriptorMap) => {
                if (prototype === null) count++
                return descriptors === undefined
                    ? create(prototype)
                    : create(prototype, descriptors)
            },
        )
        try {
            for (const name of ['native', 'fast'] as const) {
                count = 0
                result.current[name].getFilteredRowModel()
                allocations[name] = count
            }
        } finally {
            spy.mockRestore()
        }
        expect(allocations.native - allocations.fast).toBe(2 * data.length)
        expect(allocations.fast).toBe(4 * data.length + 1)
    })

    test('coordinated factories retain exposed metadata reset identities and deferred reset order', async () => {
        const empty: ColumnFiltersState = []
        const active: ColumnFiltersState = [{ id: 'value', value: 'Alpha' }]
        const { result, rerender } = renderHook(
            ({
                rows,
                filters,
            }: {
                rows: Item[]
                filters: ColumnFiltersState
            }) => ({
                native: useTable({
                    features: nativeFeatures,
                    data: rows,
                    columns,
                    getRowId,
                    state: { columnFilters: filters },
                }),
                fast: useTable({
                    features: fastFeatures,
                    data: rows,
                    columns,
                    getRowId,
                    state: { columnFilters: filters },
                }),
            }),
            { initialProps: { rows: data, filters: empty } },
        )
        const callbacks = { native: [] as string[], fast: [] as string[] }
        for (const name of ['native', 'fast'] as const) {
            // Expose the initial core first: both pipelines must replace these maps.
            const row = result.current[name].getCoreRowModel().rows[0]
            const filters = row.columnFilters
            const metadata = row.columnFiltersMeta
            filters.custom = false
            metadata.custom = { stale: true }
            const raw = row.table
            for (const method of [
                'autoResetExpanded',
                'autoResetPageIndex',
                'autoResetSorting',
                'autoResetCellSelection',
            ]) {
                Reflect.set(raw, method, () => {
                    callbacks[name].push(method)
                })
            }
            result.current[name].getFilteredRowModel()
            expect(row.columnFilters).not.toBe(filters)
            expect(row.columnFiltersMeta).not.toBe(metadata)
            expect(Object.keys(row.columnFilters)).toEqual([])
            expect(Object.keys(row.columnFiltersMeta)).toEqual([])
            expect(filters.custom).toBe(false)
            const current = row.columnFilters
            result.current[name].getFilteredRowModel()
            expect(row.columnFilters).toBe(current)
        }
        await act(async () => {
            await Promise.resolve()
        })
        expect(callbacks.native).toEqual([])
        expect(callbacks.fast).toEqual([])
        // New unfiltered data takes the owned fast branch; active and clear
        // transitions then exercise both fallback and wrapper reset ownership.
        for (const props of [
            { rows: [...data], filters: empty },
            { rows: data, filters: active },
            { rows: data, filters: empty },
        ]) {
            rerender(props)
            result.current.native.getFilteredRowModel()
            result.current.fast.getFilteredRowModel()
        }
        await act(async () => {
            await Promise.resolve()
        })
        expect(callbacks.fast).toEqual(callbacks.native)
        expect(callbacks.native).toHaveLength(11)
        expect(
            result.current.fast.getFilteredRowModel().rows.map((row) => row.id),
        ).toEqual(['a', 'b'])
    })

    test.each(['subRows', 'initializer'] as const)(
        'preserves %s changes made inside getRowId without replaying callbacks',
        (change) => {
            const nested: Item[] = [
                { id: 'parent', value: 'Parent', children: data },
            ]
            for (const selected of [nativeFeatures, fastFeatures]) {
                const calls: string[] = []
                const exposed: Record<string, boolean>[] = []
                let mutate: (() => void) | undefined
                const identify = (
                    row: Item,
                    index: number,
                    parent?: { id: string },
                ) => {
                    calls.push(`${row.id}:${index}:${parent?.id ?? ''}`)
                    const apply = mutate
                    mutate = undefined
                    apply?.()
                    return row.id
                }
                const { result, unmount } = renderHook(() =>
                    useTable({
                        features: selected,
                        data: change === 'subRows' ? nested : data,
                        columns,
                        getRowId: identify,
                    }),
                )
                const raw = result.current.getColumn('value').table
                mutate =
                    change === 'subRows'
                        ? () =>
                              raw.setOptions((previous) => ({
                                  ...previous,
                                  getSubRows: (row: Item) => row.children,
                              }))
                        : () => {
                              raw._rowInstanceInitFns.push((row) => {
                                  row.columnFilters.custom = true
                                  exposed.push(row.columnFilters)
                              })
                          }
                const model = result.current.getFilteredRowModel()
                if (change === 'subRows') {
                    expect(model.flatRows.map((row) => row.id)).toEqual([
                        'parent',
                        'a',
                        'b',
                    ])
                    expect(calls).toEqual([
                        'parent:0:',
                        'a:0:parent',
                        'b:1:parent',
                    ])
                    expect(model.rows[0].subRows[0]).toBe(model.flatRows[1])
                } else {
                    expect(calls).toEqual(['a:0:', 'b:1:'])
                    expect(exposed).toHaveLength(2)
                    expect(model.rows[0].columnFilters).not.toBe(exposed[0])
                    expect(exposed[0].custom).toBe(true)
                    expect(Object.keys(model.rows[0].columnFilters)).toEqual([])
                }
                unmount()
            }
        },
    )

    test.each(['replacement', 'cacheSetter'] as const)(
        'preserves native row construction after getRowId prototype %s changes',
        (change) => {
            for (const selected of [nativeFeatures, fastFeatures]) {
                let mutate: (() => void) | undefined
                const calls: string[] = []
                let cacheWrites = 0
                const identify = (row: Item, index: number) => {
                    calls.push(`${row.id}:${index}`)
                    const apply = mutate
                    mutate = undefined
                    apply?.()
                    return row.id
                }
                const { result, rerender, unmount } = renderHook(
                    ({ rows }: { rows: Item[] }) =>
                        useTable({
                            features: selected,
                            data: rows,
                            columns,
                            getRowId: identify,
                        }),
                    { initialProps: { rows: data } },
                )
                const raw = result.current.getCoreRowModel().rows[0].table
                const prototype = raw._rowPrototype
                if (change === 'replacement') {
                    mutate = () => {
                        raw._rowPrototype = Object.assign(
                            Object.create(prototype),
                            { getValue: () => 'Changed' },
                        )
                    }
                } else {
                    mutate = () => {
                        Object.defineProperty(prototype, '_valuesCache', {
                            configurable: true,
                            set(this: object, value: unknown) {
                                cacheWrites++
                                Object.defineProperty(this, '_valuesCache', {
                                    value,
                                    writable: true,
                                    configurable: true,
                                    enumerable: true,
                                })
                            },
                        })
                    }
                }
                rerender({ rows: [...data] })
                const model = result.current.getFilteredRowModel()
                expect(calls).toEqual(['a:0', 'b:1', 'a:0', 'b:1'])
                expect(model.rows[0].getValue('value')).toBe(
                    change === 'replacement' ? 'Changed' : 'Alpha',
                )
                expect(cacheWrites).toBe(
                    change === 'cacheSetter' ? data.length : 0,
                )
                expect(Object.hasOwn(model.rows[0], '_valuesCache')).toBe(true)
                unmount()
            }
        },
    )

    test('retains the native initial unfiltered model and independent public maps', () => {
        const { result } = renderHook(() => ({
            native: useTable({
                features: nativeFeatures,
                data,
                columns,
                getRowId,
            }),
            fast: useTable({ features: fastFeatures, data, columns, getRowId }),
        }))
        for (const name of ['native', 'fast'] as const) {
            const model = result.current[name].getFilteredRowModel()
            expect(model).toBe(result.current[name].getCoreRowModel())
            expect(model.rows.map((row) => row.id)).toEqual(['a', 'b'])
            for (const row of model.rows) {
                expect(Object.getPrototypeOf(row.columnFilters)).toBeNull()
                expect(Object.getPrototypeOf(row.columnFiltersMeta)).toBeNull()
                expect(Object.keys(row.columnFilters)).toEqual([])
                expect(Object.keys(row.columnFiltersMeta)).toEqual([])
            }
            expect(model.rows[0].columnFilters).not.toBe(
                model.rows[1].columnFilters,
            )
            expect(model.rows[0].columnFilters).not.toBe(
                model.rows[0].columnFiltersMeta,
            )
        }
    })

    test.each(['core', 'preFiltered'] as const)(
        'resets exposed map values and identities after a %s read',
        (read) => {
            for (const name of ['native', 'fast'] as const) {
                const { result, unmount } = renderHook(() =>
                    useTable({
                        features: features[name],
                        data,
                        columns,
                        getRowId,
                    }),
                )
                const model =
                    read === 'core'
                        ? result.current.getCoreRowModel()
                        : result.current.getPreFilteredRowModel()
                const row = model.rows[0]
                const previous = row.columnFilters
                const metadata = row.columnFiltersMeta
                previous.custom = false
                metadata.custom = { stale: true }
                result.current.getFilteredRowModel()
                expect(row.columnFilters).not.toBe(previous)
                expect(row.columnFiltersMeta).not.toBe(metadata)
                expect(Object.keys(row.columnFilters)).toEqual([])
                expect(Object.keys(row.columnFiltersMeta)).toEqual([])
                expect(previous.custom).toBe(false)
                unmount()
            }
        },
    )

    test('delegates active filters, custom metadata, nested accessors and clearing', () => {
        const filteredColumns = helper.columns([
            helper.accessor('nested.value', {
                id: 'nested',
                filterFn: metadataFilter,
            }),
        ])
        const { result, rerender } = renderHook(
            ({ filters }: { filters: ColumnFiltersState }) => ({
                native: useTable({
                    features: nativeFeatures,
                    data,
                    columns: filteredColumns,
                    getRowId,
                    state: { columnFilters: filters },
                }),
                fast: useTable({
                    features: fastFeatures,
                    data,
                    columns: filteredColumns,
                    getRowId,
                    state: { columnFilters: filters },
                }),
            }),
            { initialProps: { filters: [] } },
        )
        result.current.native.getFilteredRowModel()
        result.current.fast.getFilteredRowModel()
        rerender({ filters: [{ id: 'nested', value: 'Beta' }] })
        for (const name of ['native', 'fast'] as const) {
            expect(
                result.current[name]
                    .getFilteredRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(['b'])
            const core = result.current[name].getCoreRowModel()
            expect(core.rows[0].columnFiltersMeta.nested).toEqual({
                value: 'Alpha',
            })
        }
        rerender({ filters: [] })
        for (const name of ['native', 'fast'] as const) {
            expect(
                result.current[name]
                    .getFilteredRowModel()
                    .rows.map((row) => row.id),
            ).toEqual(['a', 'b'])
            expect(
                Object.keys(
                    result.current[name].getCoreRowModel().rows[0]
                        .columnFiltersMeta,
                ),
            ).toEqual([])
        }
    })

    test.each([0, false])(
        'treats global filter %s as active',
        (globalFilter) => {
            const globalData: Item[] = [
                { id: 'a', value: 0 },
                { id: 'b', value: false },
            ]
            for (const name of ['native', 'fast'] as const) {
                const { result, unmount } = renderHook(() =>
                    useTable({
                        features: features[name],
                        data: globalData,
                        columns,
                        getRowId,
                        globalFilterFn: equalityFilter,
                        getColumnCanGlobalFilter: () => true,
                        initialState: { globalFilter },
                    }),
                )
                expect(
                    result.current
                        .getFilteredRowModel()
                        .rows.map((row) => row.id),
                ).toEqual([globalFilter === 0 ? 'a' : 'b'])
                expect(
                    result.current.getCoreRowModel().rows[0].columnFilters
                        .__global__,
                ).toBe(globalFilter === 0)
                unmount()
            }
        },
    )

    test('retains native data replacement and memo dependency behavior', () => {
        const replacement = [...data, { id: 'c', value: 'Gamma' }]
        const { result, rerender } = renderHook(
            ({ rows }: { rows: Item[] }) => ({
                native: useTable({
                    features: nativeFeatures,
                    data: rows,
                    columns,
                    getRowId,
                }),
                fast: useTable({
                    features: fastFeatures,
                    data: rows,
                    columns,
                    getRowId,
                }),
            }),
            { initialProps: { rows: data } },
        )
        const previous = result.current.fast.getFilteredRowModel()
        result.current.native.getFilteredRowModel()
        rerender({ rows: replacement })
        for (const name of ['native', 'fast'] as const) {
            const model = result.current[name].getFilteredRowModel()
            expect(model.rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
            expect(result.current[name].getFilteredRowModel()).toBe(model)
        }
        expect(result.current.fast.getFilteredRowModel()).not.toBe(previous)
    })

    test('delegates hierarchical models and preserves custom getValue reads', () => {
        const nested: Item[] = [
            { id: 'parent', value: 'Alpha', children: data },
        ]
        for (const name of ['native', 'fast'] as const) {
            const { result, rerender, unmount } = renderHook(
                ({ filters }: { filters: ColumnFiltersState }) =>
                    useTable({
                        features: features[name],
                        data: nested,
                        columns,
                        getRowId,
                        getSubRows: (row) => row.children,
                        state: { columnFilters: filters },
                    }),
                { initialProps: { filters: [] } },
            )
            expect(result.current.getFilteredRowModel().flatRows).toHaveLength(
                3,
            )
            const row = result.current.getCoreRowModel().rows[0]
            let reads = 0
            row.getValue = (() => {
                reads++
                return 'Custom'
            }) as typeof row.getValue
            rerender({ filters: [{ id: 'value', value: 'Custom' }] })
            expect(
                result.current
                    .getFilteredRowModel()
                    .rows.map((item) => item.id),
            ).toEqual(['parent'])
            expect(reads).toBeGreaterThan(0)
            unmount()
        }
    })

    test('delegates row initializers that can expose metadata during construction', () => {
        for (const name of ['native', 'fast'] as const) {
            const exposed: Record<string, boolean>[] = []
            const customFeatures = {
                ...features[name],
                columnFilteringFeature: {
                    ...columnFilteringFeature,
                    initRowInstanceData: (
                        row: Parameters<
                            NonNullable<
                                typeof columnFilteringFeature.initRowInstanceData
                            >
                        >[0],
                    ) => {
                        columnFilteringFeature.initRowInstanceData?.(row)
                        row.columnFilters.custom = false
                        exposed.push(row.columnFilters)
                    },
                },
            }
            const { result, unmount } = renderHook(() =>
                useTable({ features: customFeatures, data, columns, getRowId }),
            )
            const model = result.current.getFilteredRowModel()
            expect(exposed).toHaveLength(2)
            expect(model.rows[0].columnFilters).not.toBe(exposed[0])
            expect(Object.keys(model.rows[0].columnFilters)).toEqual([])
            expect(exposed[0].custom).toBe(false)
            unmount()
        }
    })

    test('honors a custom getValue exposed before flat filtering', () => {
        for (const name of ['native', 'fast'] as const) {
            const { result, unmount } = renderHook(() =>
                useTable({
                    features: features[name],
                    data,
                    columns,
                    getRowId,
                    initialState: {
                        columnFilters: [{ id: 'value', value: 'Custom' }],
                    },
                }),
            )
            const row = result.current.getCoreRowModel().rows[0]
            let reads = 0
            row.getValue = (() => {
                reads++
                return 'Custom'
            }) as typeof row.getValue
            expect(
                result.current
                    .getFilteredRowModel()
                    .rows.map((item) => item.id),
            ).toEqual(['a'])
            expect(reads).toBeGreaterThan(0)
            unmount()
        }
    })

    test('manual filtering leaves existing public metadata intact', () => {
        for (const name of ['native', 'fast'] as const) {
            const { result, unmount } = renderHook(() =>
                useTable({
                    features: features[name],
                    data,
                    columns,
                    getRowId,
                    manualFiltering: true,
                    initialState: {
                        columnFilters: [{ id: 'value', value: 'absent' }],
                    },
                }),
            )
            const model = result.current.getCoreRowModel()
            const map = model.rows[0].columnFilters
            map.custom = true
            expect(result.current.getFilteredRowModel()).toBe(model)
            expect(model.rows[0].columnFilters).toBe(map)
            expect(map.custom).toBe(true)
            unmount()
        }
    })

    test.each(['unfiltered', 'active'] as const)(
        'matches deferred resets when initially %s, including same-tick transitions',
        async (initial) => {
            const empty: ColumnFiltersState = []
            const active: ColumnFiltersState = [{ id: 'value', value: 'Alpha' }]
            const other: ColumnFiltersState = [{ id: 'value', value: 'Beta' }]
            const { result, rerender } = renderHook(
                ({ filters }: { filters: ColumnFiltersState }) => ({
                    native: useTable({
                        features: nativeFeatures,
                        data,
                        columns,
                        getRowId,
                        autoResetPageIndex: true,
                        state: { columnFilters: filters },
                    }),
                    fast: useTable({
                        features: fastFeatures,
                        data,
                        columns,
                        getRowId,
                        autoResetPageIndex: true,
                        state: { columnFilters: filters },
                    }),
                }),
                {
                    initialProps: {
                        filters: initial === 'active' ? active : empty,
                    },
                },
            )
            const counts = { native: 0, fast: 0 }
            for (const name of ['native', 'fast'] as const) {
                const raw =
                    result.current[name].getFilteredRowModel().rows[0].table
                raw.autoResetPageIndex = () => {
                    counts[name]++
                }
            }
            await act(async () => {
                await Promise.resolve()
            })
            expect(counts).toEqual({ native: 0, fast: 0 })
            for (const filters of [active, other, empty, active, empty]) {
                rerender({ filters })
                result.current.native.getFilteredRowModel()
                result.current.fast.getFilteredRowModel()
            }
            await act(async () => {
                await Promise.resolve()
            })
            expect(counts.fast).toBe(counts.native)
            expect(counts.native).toBe(initial === 'active' ? 4 : 5)
        },
    )
})

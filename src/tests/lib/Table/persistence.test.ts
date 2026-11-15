import { describe, expect, test } from 'bun:test'
import {
    createBrowserTableStateStorage,
    createTableStateSnapshot,
    normalizeTableStateSnapshot,
} from '../../../lib/Table/persistence.ts'

describe('table state snapshots', () => {
    test('roundtrips all supported slices without retaining caller objects or row records', () => {
        const state = {
            sorting: [{ id: 'name', desc: false }],
            columnFilters: [
                { id: 'status', value: { selected: ['active'], empty: null } },
            ],
            globalFilter: 'needle',
            columnVisibility: { hidden: false },
            columnSizing: { name: 240 },
            pagination: { pageIndex: 2, pageSize: 30 },
            rowSelection: { row1: true },
            expanded: { row1: true },
            showFilters: true,
            rowOrder: ['row2', 'row1'],
            data: [{ private: 'do not persist' }],
        }
        const snapshot = createTableStateSnapshot(state)
        expect(snapshot.state).toEqual({
            ...state,
            data: undefined,
        })
        expect(Object.hasOwn(snapshot.state, 'data')).toBe(false)
        expect(
            normalizeTableStateSnapshot(JSON.parse(JSON.stringify(snapshot))),
        ).toEqual(snapshot)
        state.columnFilters[0]?.value.selected.push('changed')
        const firstSort = state.sorting[0]
        if (firstSort) firstSort.desc = true
        expect(snapshot.state.sorting).toEqual([{ id: 'name', desc: false }])
        expect(snapshot.state.columnFilters).toEqual([
            { id: 'status', value: { selected: ['active'], empty: null } },
        ])
    })

    test('honors field allowlists and permits partial and empty snapshots', () => {
        const snapshot = {
            version: 1,
            state: { showFilters: false, globalFilter: 'a' },
        }
        expect(normalizeTableStateSnapshot(snapshot, ['showFilters'])).toEqual({
            version: 1,
            state: { showFilters: false },
        })
        expect(createTableStateSnapshot(snapshot.state, [])).toEqual({
            version: 1,
            state: {},
        })
        expect(normalizeTableStateSnapshot({ version: 1, state: {} })).toEqual({
            version: 1,
            state: {},
        })
        expect(
            normalizeTableStateSnapshot({
                version: 1,
                state: { expanded: true },
            })?.state.expanded,
        ).toBe(true)
    })

    test.each([
        null,
        {},
        { version: 2, state: {} },
        { version: '1', state: {} },
        { version: 1, state: [] },
        { version: 1, state: null },
        { version: 1, state: { sorting: [{ id: 'a', desc: 'yes' }] } },
        {
            version: 1,
            state: { columnFilters: [{ id: 'a', value: undefined }] },
        },
        { version: 1, state: { globalFilter: 3 } },
        { version: 1, state: { showFilters: 'yes' } },
        { version: 1, state: { columnVisibility: { a: 1 } } },
        { version: 1, state: { columnSizing: { a: 0 } } },
        { version: 1, state: { columnSizing: { a: Infinity } } },
        { version: 1, state: { pagination: { pageIndex: -1, pageSize: 10 } } },
        { version: 1, state: { pagination: { pageIndex: 0, pageSize: 0 } } },
        { version: 1, state: { pagination: { pageIndex: 0.5, pageSize: 10 } } },
        { version: 1, state: { rowSelection: { a: 'yes' } } },
        { version: 1, state: { expanded: false } },
        { version: 1, state: { rowOrder: ['a', 2] } },
    ])('rejects malformed snapshots: %j', (value) => {
        expect(normalizeTableStateSnapshot(value)).toBeNull()
    })

    test('rejects sparse row orders', () => {
        const rowOrder = ['removed']
        delete rowOrder[0]
        expect(
            normalizeTableStateSnapshot({ version: 1, state: { rowOrder } }),
        ).toBeNull()
    })

    test('preserves open date ranges while omitting undefined optional object properties', () => {
        const snapshot = createTableStateSnapshot({
            columnFilters: [
                { id: 'joined', value: { from: '2026-11-15', to: undefined } },
            ],
        })
        expect(snapshot.state.columnFilters).toEqual([
            { id: 'joined', value: { from: '2026-11-15' } },
        ])
        expect(
            normalizeTableStateSnapshot(JSON.parse(JSON.stringify(snapshot))),
        ).toEqual(snapshot)
    })

    test('omits unsupported filter values without coercion and preserves serializable filters', () => {
        const cycle: Record<string, unknown> = {}
        cycle.self = cycle
        const unsupported = [
            undefined,
            () => 'value',
            1n,
            Infinity,
            NaN,
            Symbol('x'),
            new Date(),
            cycle,
            [undefined],
            new Proxy(
                {},
                {
                    getPrototypeOf() {
                        throw new Error('untrusted value')
                    },
                },
            ),
        ]
        const snapshot = createTableStateSnapshot({
            showFilters: true,
            columnFilters: [
                ...unsupported.map((value, index) => ({
                    id: String(index),
                    value,
                })),
                {
                    id: 'safe',
                    value: { bool: false, number: 0, nested: [null, 'x'] },
                },
            ],
        })
        expect(snapshot.state).toEqual({
            showFilters: true,
            columnFilters: [
                {
                    id: 'safe',
                    value: { bool: false, number: 0, nested: [null, 'x'] },
                },
            ],
        })
        expect(() => JSON.stringify(snapshot)).not.toThrow()
    })

    test('strips dangerous keys and ignores prototype-bearing objects and accessors', () => {
        const snapshot = normalizeTableStateSnapshot(
            JSON.parse(
                '{"version":1,"state":{"columnVisibility":{"__proto__":true,"constructor":false,"safe":true},"columnFilters":[{"id":"a","value":{"prototype":5,"ok":1}}],"records":[{"secret":true}]}}',
            ),
        )
        expect(snapshot?.state).toEqual({
            columnVisibility: { safe: true },
            columnFilters: [{ id: 'a', value: { ok: 1 } }],
        })
        expect(Object.getPrototypeOf(snapshot?.state.columnVisibility)).toBe(
            Object.prototype,
        )
        expect(
            normalizeTableStateSnapshot({
                version: 1,
                state: Object.create({ showFilters: true }),
            }),
        ).toBeNull()
        let accessed = false
        const state = Object.defineProperty({}, 'showFilters', {
            get() {
                accessed = true
                return true
            },
        })
        expect(normalizeTableStateSnapshot({ version: 1, state })).toBeNull()
        expect(accessed).toBe(false)
    })

    test('supports large ordinary filter values without truncation', () => {
        const values = Array.from(
            { length: 5000 },
            (_, index) => `value-${index}`,
        )
        const snapshot = createTableStateSnapshot({
            columnFilters: [{ id: 'large', value: values }],
        })
        expect(snapshot.state.columnFilters?.[0]?.value).toEqual(values)
    })
})

describe('browser table storage', () => {
    test.each(['local', 'session'] as const)(
        '%s storage roundtrips and removes only its own key',
        async (kind) => {
            const key = `table-persistence-test-${kind}`
            const browserStorage =
                kind === 'local' ? window.localStorage : window.sessionStorage
            const otherStorage =
                kind === 'local' ? window.sessionStorage : window.localStorage
            const storage = createBrowserTableStateStorage(kind)
            const snapshot = createTableStateSnapshot({
                globalFilter: 'search',
            })
            try {
                expect(await storage.load(key)).toBeNull()
                await storage.save(key, snapshot)
                expect(browserStorage.getItem(key)).toBe(
                    JSON.stringify(snapshot),
                )
                expect(otherStorage.getItem(key)).toBeNull()
                expect(await storage.load(key)).toEqual(snapshot)
                await storage.remove?.(key)
                expect(await storage.load(key)).toBeNull()
                browserStorage.setItem(key, '{broken json')
                expect(() => storage.load(key)).toThrow()
            } finally {
                browserStorage.removeItem(key)
            }
        },
    )
})

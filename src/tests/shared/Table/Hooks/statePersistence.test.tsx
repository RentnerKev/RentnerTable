import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { createTableColumnHelper } from '../../../../lib/Table/table.ts'
import { useDataTableLogic } from '../../../../shared/Table/Hooks/useDataTableLogic.ts'
import type {
    TableStateController,
    TableStateSnapshot,
    TableStateStorage,
} from '../../../../shared/Table/Types/persistence.types.ts'

afterEach(cleanup)

interface RecordRow {
    id: string
    name: string
    role: string
}
const helper = createTableColumnHelper<RecordRow>()
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        meta: { filter: { type: 'text' } },
    }),
    helper.accessor('role', { header: 'Role' }),
])
const data = Array.from({ length: 40 }, (_, index) => ({
    id: `row-${index}`,
    name: `Record ${index}`,
    role: 'member',
}))
const getRowId = (row: RecordRow) => row.id
const base = { data, columns, getRowId }
function BrowserStorageTable() {
    const logic = useDataTableLogic({ ...base, persistence: 'ssr-browser-key' })
    return <span>{logic.state.persistenceStatus}</span>
}
const snapshot = (state: TableStateSnapshot['state']): TableStateSnapshot => ({
    version: 1,
    state,
})

function memoryStorage(initial?: TableStateSnapshot) {
    const records = new Map<string, TableStateSnapshot>()
    if (initial) records.set('preferences', initial)
    const storage: TableStateStorage = {
        load: mock((key: string) => records.get(key) ?? null),
        save: mock((key: string, value: TableStateSnapshot) => {
            records.set(key, structuredClone(value))
        }),
        remove: mock((key: string) => {
            records.delete(key)
        }),
    }
    return { records, storage }
}

describe('table state persistence integration', () => {
    test('browser pagehide does not recreate preferences that were explicitly cleared', async () => {
        const key = 'table-clear-pagehide-regression'
        const { result, unmount } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: { key, debounceMs: 60_000 },
            }),
        )
        try {
            await waitFor(() =>
                expect(result.current.state.persistenceStatus).toBe('ready'),
            )
            act(() => result.current.handler.handleSearch('Record 1'))
            await act(async () => {
                await result.current.handler.handleFlushState()
            })
            await act(async () => {
                await result.current.handler.handleClearStoredState()
            })
            expect(window.localStorage.getItem(key)).toBeNull()
            act(() => window.dispatchEvent(new Event('pagehide')))
            expect(window.localStorage.getItem(key)).toBeNull()
            act(() => result.current.handler.handleSearch('Record 2'))
            act(() => window.dispatchEvent(new Event('pagehide')))
            expect(
                JSON.parse(window.localStorage.getItem(key) ?? '{}').state
                    .globalFilter,
            ).toBe('Record 2')
        } finally {
            unmount()
            window.localStorage.removeItem(key)
        }
    })
    test.each(['local', 'session'] as const)(
        '%s storage restores full preferences and uncontrolled row order across remount',
        async (storage) => {
            const key = `table-integration-${storage}`
            const browserStorage =
                storage === 'local'
                    ? window.localStorage
                    : window.sessionStorage
            const persistence = { key, storage, debounceMs: 60_000 }
            const options = {
                ...base,
                persistence,
                selectable: true,
                resizableColumns: true,
                reorderableRows: true,
                renderExpandedRow: () => null,
            }
            const first = renderHook(() => useDataTableLogic(options))
            try {
                await waitFor(() =>
                    expect(first.result.current.state.persistenceStatus).toBe(
                        'ready',
                    ),
                )
                act(() =>
                    first.result.current.handler.handleRowReorder(
                        'row-0',
                        'row-2',
                    ),
                )
                act(() =>
                    first.result.current.handler.handleRestoreState(
                        snapshot({
                            sorting: [{ id: 'name', desc: true }],
                            columnFilters: [{ id: 'name', value: 'Record' }],
                            globalFilter: 'Record',
                            columnVisibility: { role: false },
                            columnSizing: { name: 310 },
                            pagination: { pageIndex: 2, pageSize: 5 },
                            rowSelection: { 'row-3': true },
                            expanded: { 'row-3': true },
                            showFilters: true,
                        }),
                    ),
                )
                await waitFor(() =>
                    expect(first.result.current.state.showFilters).toBe(true),
                )
                await act(async () => {
                    await first.result.current.handler.handleFlushState()
                })
                const saved = first.result.current.handler.handleGetState()
                expect(saved.state.rowOrder?.slice(0, 3)).toEqual([
                    'row-1',
                    'row-2',
                    'row-0',
                ])
                expect(saved.state.pagination).toEqual({
                    pageIndex: 2,
                    pageSize: 5,
                })
                first.unmount()
                const second = renderHook(() => useDataTableLogic(options))
                await waitFor(() =>
                    expect(second.result.current.state.persistenceStatus).toBe(
                        'ready',
                    ),
                )
                expect(second.result.current.handler.handleGetState()).toEqual(
                    saved,
                )
                expect(
                    second.result.current.table.options.data
                        .slice(0, 3)
                        .map(getRowId),
                ).toEqual(['row-1', 'row-2', 'row-0'])
                second.unmount()
            } finally {
                first.unmount()
                browserStorage.removeItem(key)
            }
        },
    )

    test('async loading preserves fields edited by the user while restoring untouched fields', async () => {
        const loaded = Promise.withResolvers<unknown>()
        const storage: TableStateStorage = {
            load: () => loaded.promise,
            save: mock(() => {}),
        }
        const { result } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage,
                    debounceMs: 60_000,
                },
            }),
        )
        act(() => result.current.handler.handleSearch('Record 1'))
        await act(async () => {
            loaded.resolve(
                snapshot({
                    globalFilter: 'old search',
                    columnSizing: { name: 280 },
                    showFilters: true,
                }),
            )
        })
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        expect(result.current.state.search).toBe('Record 1')
        expect(result.current.table.state.columnSizing).toEqual({ name: 280 })
        expect(result.current.state.showFilters).toBe(true)
    })

    test('key changes abort stale loads and ignore adapters that still resolve', async () => {
        const oldLoad = Promise.withResolvers<unknown>()
        const newLoad = Promise.withResolvers<unknown>()
        const signals = new Map<string, AbortSignal | undefined>()
        const storage: TableStateStorage = {
            load: (key, signal) => {
                signals.set(key, signal)
                return key === 'old' ? oldLoad.promise : newLoad.promise
            },
            save: mock(() => {}),
        }
        const { result, rerender } = renderHook(
            ({ key }) =>
                useDataTableLogic({
                    ...base,
                    persistence: { key, storage, debounceMs: 60_000 },
                }),
            { initialProps: { key: 'old' } },
        )
        await waitFor(() => expect(signals.has('old')).toBe(true))
        rerender({ key: 'new' })
        await waitFor(() => expect(signals.has('new')).toBe(true))
        expect(signals.get('old')?.aborted).toBe(true)
        await act(async () => {
            newLoad.resolve(snapshot({ globalFilter: 'Record 2' }))
        })
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        await act(async () => {
            oldLoad.resolve(snapshot({ globalFilter: 'stale' }))
        })
        expect(result.current.state.search).toBe('Record 2')
    })

    test('restores controlled TanStack state through native callbacks and preserves saved pagination', async () => {
        const { storage } = memoryStorage(
            snapshot({
                globalFilter: 'Record',
                pagination: { pageIndex: 2, pageSize: 5 },
            }),
        )
        const changedSearch = mock(() => {})
        const changedPage = mock(() => {})
        const { result } = renderHook(() => {
            const [globalFilter, setGlobalFilter] = useState('')
            const [pagination, setPagination] = useState({
                pageIndex: 0,
                pageSize: 10,
            })
            return useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage,
                    debounceMs: 60_000,
                },
                tableOptions: {
                    state: { globalFilter, pagination },
                    onGlobalFilterChange: (value) => {
                        changedSearch()
                        setGlobalFilter(value)
                    },
                    onPaginationChange: (value) => {
                        changedPage()
                        setPagination(value)
                    },
                },
            })
        })
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        expect(changedSearch).toHaveBeenCalled()
        expect(changedPage).toHaveBeenCalled()
        expect(result.current.table.state.globalFilter).toBe('Record')
        expect(result.current.table.state.pagination).toEqual({
            pageIndex: 2,
            pageSize: 5,
        })
        act(() => result.current.handler.handleSearch('Record 1'))
        await waitFor(() =>
            expect(result.current.table.state.pagination.pageIndex).toBe(0),
        )
    })

    test('keeps a saved page while data is loading and only clamps after data arrives', async () => {
        const { storage } = memoryStorage(
            snapshot({ pagination: { pageIndex: 3, pageSize: 5 } }),
        )
        const { result, rerender } = renderHook(
            ({ rows, isLoading }: { rows: RecordRow[]; isLoading: boolean }) =>
                useDataTableLogic({
                    ...base,
                    data: rows,
                    isLoading,
                    persistence: {
                        key: 'preferences',
                        storage,
                        debounceMs: 60_000,
                    },
                }),
            { initialProps: { rows: [], isLoading: true } },
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        expect(result.current.table.state.pagination.pageIndex).toBe(3)
        rerender({ rows: data, isLoading: false })
        expect(result.current.table.state.pagination.pageIndex).toBe(3)
        rerender({ rows: data.slice(0, 6), isLoading: false })
        await waitFor(() =>
            expect(result.current.table.state.pagination.pageIndex).toBe(1),
        )
    })

    test('serializes saves so returning to a previously saved value wins over an in-flight newer value', async () => {
        const gate = Promise.withResolvers<void>()
        const stored = memoryStorage()
        const values: string[] = []
        const storage: TableStateStorage = {
            ...stored.storage,
            save: async (key, value) => {
                values.push(value.state.globalFilter ?? '')
                if (value.state.globalFilter === 'Record 1') await gate.promise
                await stored.storage.save(key, value)
            },
        }
        const { result } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage,
                    debounceMs: 60_000,
                },
            }),
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        await act(async () => {
            await result.current.handler.handleFlushState()
        })
        act(() => result.current.handler.handleSearch('Record 1'))
        let firstSave: Promise<void> = Promise.resolve()
        act(() => {
            firstSave = result.current.handler.handleFlushState()
        })
        await waitFor(() => expect(values).toContain('Record 1'))
        act(() => result.current.handler.handleSearch(''))
        let lastSave: Promise<void> = Promise.resolve()
        act(() => {
            lastSave = result.current.handler.handleFlushState()
        })
        await act(async () => {
            gate.resolve()
            await Promise.all([firstSave, lastSave])
        })
        expect(stored.records.get('preferences')?.state.globalFilter).toBe('')
        expect(values).toEqual(['', 'Record 1', ''])
    })

    test('clear runs after outstanding saves and cancels debounced writes', async () => {
        const gate = Promise.withResolvers<void>()
        const stored = memoryStorage()
        const events: string[] = []
        const storage: TableStateStorage = {
            load: stored.storage.load,
            save: async (key, value) => {
                events.push('save-start')
                await gate.promise
                await stored.storage.save(key, value)
                events.push('save-end')
            },
            remove: async (key) => {
                events.push('remove')
                await stored.storage.remove?.(key)
            },
        }
        const { result } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage,
                    debounceMs: 60_000,
                },
            }),
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        let save: Promise<void> = Promise.resolve()
        act(() => {
            save = result.current.handler.handleFlushState()
        })
        await waitFor(() => expect(events).toEqual(['save-start']))
        act(() => result.current.handler.handleSearch('Record 1'))
        let clear: Promise<void> = Promise.resolve()
        act(() => {
            clear = result.current.handler.handleClearStoredState()
        })
        await act(async () => {
            gate.resolve()
            await Promise.all([save, clear])
        })
        expect(events).toEqual(['save-start', 'save-end', 'remove'])
        expect(stored.records.has('preferences')).toBe(false)
        expect(result.current.state.search).toBe('Record 1')
    })

    test('reports failed loading without saving defaults and can explicitly reload', async () => {
        const failure = new Error('storage unavailable')
        let fail = true
        const stored = memoryStorage(snapshot({ globalFilter: 'Record' }))
        const onError = mock(() => {})
        const storage: TableStateStorage = {
            ...stored.storage,
            load: (key) => {
                if (fail) throw failure
                return stored.storage.load(key)
            },
        }
        const { result } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage,
                    debounceMs: 0,
                    onError,
                },
            }),
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('error'),
        )
        expect(result.current.state.persistenceError).toBe(failure)
        expect(onError).toHaveBeenCalledWith(failure, {
            operation: 'load',
            key: 'preferences',
        })
        act(() => result.current.handler.handleSearch('user edit'))
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
        })
        expect(stored.storage.save).not.toHaveBeenCalled()
        expect(stored.records.get('preferences')?.state.globalFilter).toBe(
            'Record',
        )
        fail = false
        act(() => {
            result.current.handler.handleReloadState().catch(() => {})
        })
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        expect(result.current.state.search).toBe('Record')
    })

    test('opt-out retains imperative state export and field selection limits restoration and writes', async () => {
        const stateRef = createRef<TableStateController>()
        const disabled = renderHook(() =>
            useDataTableLogic({ ...base, persistence: false, stateRef }),
        )
        expect(disabled.result.current.state.persistenceStatus).toBe('disabled')
        act(() => {
            stateRef.current?.restoreState(snapshot({ globalFilter: 'Record' }))
        })
        expect(stateRef.current?.getState().state.globalFilter).toBe('Record')
        await stateRef.current?.flush()
        disabled.unmount()
        const stored = memoryStorage(
            snapshot({ showFilters: true, globalFilter: 'Record 2' }),
        )
        const { result } = renderHook(() =>
            useDataTableLogic({
                ...base,
                persistence: {
                    key: 'preferences',
                    storage: stored.storage,
                    fields: ['showFilters'],
                    debounceMs: 60_000,
                },
            }),
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        expect(result.current.state.showFilters).toBe(true)
        expect(result.current.state.search).toBe('')
        act(() => result.current.handler.handleToggleFilters())
        await act(async () => {
            await result.current.handler.handleFlushState()
        })
        expect(stored.records.get('preferences')).toEqual(
            snapshot({ showFilters: false }),
        )
    })

    test('uses refreshed adapter callbacks without reloading on every inline object change', async () => {
        const first = memoryStorage()
        const second = memoryStorage(snapshot({ globalFilter: 'Record 2' }))
        const { result, rerender } = renderHook(
            ({ storage }) =>
                useDataTableLogic({
                    ...base,
                    persistence: {
                        key: 'preferences',
                        storage,
                        debounceMs: 60_000,
                    },
                }),
            { initialProps: { storage: first.storage } },
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        rerender({ storage: second.storage })
        expect(second.storage.load).not.toHaveBeenCalled()
        await act(async () => {
            await result.current.handler.handleReloadState()
        })
        expect(first.storage.load).toHaveBeenCalledTimes(1)
        expect(second.storage.load).toHaveBeenCalledTimes(1)
        expect(result.current.state.search).toBe('Record 2')
        act(() => result.current.handler.handleSearch('Record 3'))
        await act(async () => {
            await result.current.handler.handleFlushState()
        })
        expect(second.records.get('preferences')?.state.globalFilter).toBe(
            'Record 3',
        )
    })

    test('retains saved row IDs while application data is still loading', async () => {
        const ids = data.map(getRowId).toReversed()
        const saved = memoryStorage(snapshot({ rowOrder: ids }))
        const { result, rerender } = renderHook(
            ({ rows, loading }) =>
                useDataTableLogic({
                    ...base,
                    data: rows,
                    isLoading: loading,
                    reorderableRows: true,
                    persistence: {
                        key: 'preferences',
                        storage: saved.storage,
                        debounceMs: 60_000,
                    },
                }),
            { initialProps: { rows: [] as RecordRow[], loading: true } },
        )
        await waitFor(() =>
            expect(result.current.state.persistenceStatus).toBe('ready'),
        )
        await act(async () => {
            await result.current.handler.handleFlushState()
        })
        expect(saved.records.get('preferences')?.state.rowOrder).toEqual(ids)
        rerender({ rows: data, loading: false })
        expect(result.current.state.rows[0]?.id).toBe(ids[0])
        expect(result.current.handler.handleGetState().state.rowOrder).toEqual(
            ids,
        )
    })

    test('server rendering does not execute persistence storage operations', () => {
        const stored = memoryStorage()
        function ServerTable() {
            const logic = useDataTableLogic({
                ...base,
                persistence: { key: 'preferences', storage: stored.storage },
            })
            return <span>{logic.state.persistenceStatus}</span>
        }
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
        if (!descriptor) throw new Error('Expected the HappyDOM window fixture')
        try {
            Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: undefined,
            })
            expect(renderToString(<ServerTable />)).toContain('loading')
            expect(renderToString(<BrowserStorageTable />)).toContain('loading')
        } finally {
            Object.defineProperty(globalThis, 'window', descriptor)
        }
        expect(stored.storage.load).not.toHaveBeenCalled()
        expect(stored.storage.save).not.toHaveBeenCalled()
    })
})

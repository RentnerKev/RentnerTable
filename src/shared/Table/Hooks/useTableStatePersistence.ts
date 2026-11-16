import {
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import type { RowData } from '@tanstack/react-table'
import {
    createBrowserTableStateStorage,
    createTableStateSnapshot,
    normalizeTableStateSnapshot,
} from '../../../lib/Table/persistence.ts'
import { restoreTableState } from '../../../lib/Table/tableState.ts'
import type {
    TableStateField,
    TableStateSnapshot,
} from '../Types/persistence.types.ts'
import type {
    TablePersistenceBindings,
    TablePersistenceLogicResult,
    TablePersistenceSession,
} from '../Types/persistenceLogic.types.ts'

export function useTableStatePersistence<TData extends RowData>(
    bindings: TablePersistenceBindings<TData>,
): TablePersistenceLogicResult {
    const { table, persistence, stateRef, showFilters, rowOrder } = bindings
    const atoms = table.atoms
    const restoring = useRef(false)
    const options =
        typeof persistence === 'string'
            ? { key: persistence }
            : persistence || undefined
    const kind =
        typeof options?.storage === 'object'
            ? 'custom'
            : (options?.storage ?? 'local')
    const fields = options?.fields
        ? [...new Set(options.fields)].toSorted()
        : undefined
    const scope = options ? JSON.stringify([kind, options.key, fields]) : ''
    if (options && !options.key.trim())
        throw new Error('Table persistence requires a non-empty key')
    const latest = useRef({ bindings, options, scope })
    const sessionRef = useRef<TablePersistenceSession | null>(null)
    const writes = useRef(Promise.resolve())
    const [status, setStatus] = useState<
        TablePersistenceLogicResult['state']['status']
    >(options ? 'loading' : 'disabled')
    const [error, setError] = useState<unknown>(null)
    const [activeScope, setActiveScope] = useState(scope)
    const [revision, renderRestoredState] = useState(0)
    useLayoutEffect(() => {
        latest.current = { bindings, options, scope }
    })

    const getState = useCallback((): TableStateSnapshot => {
        const state = latest.current.bindings.table.atoms
        return createTableStateSnapshot(
            {
                sorting: state.sorting.get(),
                columnFilters: state.columnFilters.get(),
                globalFilter: state.globalFilter.get(),
                columnVisibility: state.columnVisibility.get(),
                columnSizing: state.columnSizing.get(),
                columnOrder: state.columnOrder.get(),
                pagination: state.pagination.get(),
                rowSelection: state.rowSelection.get(),
                expanded: state.expanded.get(),
                showFilters: latest.current.bindings.showFilters,
                rowOrder: latest.current.bindings.rowOrder,
            },
            latest.current.options?.fields,
        )
    }, [])

    const report = useCallback(
        (
            session: TablePersistenceSession,
            cause: unknown,
            operation: 'load' | 'save' | 'remove',
        ) => {
            if (session.active && sessionRef.current === session) {
                setError(cause)
                setStatus('error')
            }
            try {
                const callback =
                    latest.current.scope === session.scope
                        ? latest.current.options?.onError
                        : session.options.onError
                callback?.(cause, { operation, key: session.key })
            } catch (callbackError) {
                if (session.active && sessionRef.current === session)
                    setError(callbackError)
            }
        },
        [],
    )

    const getAdapter = useCallback((session: TablePersistenceSession) => {
        const storage = latest.current.options?.storage
        return latest.current.scope === session.scope &&
            typeof storage === 'object'
            ? storage
            : session.adapter
    }, [])

    const enqueue = useCallback(
        (session: TablePersistenceSession, snapshot: TableStateSnapshot) => {
            const signature = JSON.stringify(snapshot)
            if (signature === (session.lastQueued ?? session.lastWritten))
                return writes.current
            session.lastQueued = signature
            const job = writes.current
                .then(() => getAdapter(session).save(session.key, snapshot))
                .then(() => {
                    session.lastWritten = signature
                    if (session.active && sessionRef.current === session) {
                        setError(null)
                        setStatus('ready')
                    }
                    return undefined
                })
                .catch((cause: unknown) => {
                    if (session.lastQueued === signature)
                        session.lastQueued = undefined
                    report(session, cause, 'save')
                    throw cause
                })
            // Keep future writes ordered even when one adapter operation fails.
            writes.current = job.catch(() => {})
            return job
        },
        [report, getAdapter],
    )

    const schedule = useCallback(
        (session: TablePersistenceSession, snapshot: TableStateSnapshot) => {
            if (!session.ready || !session.active) return
            if (session.timer !== undefined) clearTimeout(session.timer)
            session.pending = snapshot
            const delay = latest.current.options?.debounceMs ?? 250
            session.timer = setTimeout(
                () => {
                    session.timer = undefined
                    const pending = session.pending
                    session.pending = undefined
                    if (pending) enqueue(session, pending).catch(() => {})
                },
                Number.isFinite(delay)
                    ? Math.min(2_147_483_647, Math.max(0, delay))
                    : 250,
            )
        },
        [enqueue],
    )

    const observe = useCallback(
        (session: TablePersistenceSession) => {
            if (
                !session.active ||
                session.scope !== latest.current.scope ||
                restoring.current ||
                session.initializing
            )
                return
            const next = getState()
            if (JSON.stringify(next) === JSON.stringify(session.baseline))
                return
            session.cleared = undefined
            for (const field of Object.keys(next.state) as TableStateField[]) {
                if (
                    JSON.stringify(next.state[field]) !==
                    JSON.stringify(session.baseline.state[field])
                )
                    session.dirty.add(field)
            }
            session.baseline = next
            schedule(session, next)
        },
        [getState, schedule, restoring],
    )

    const apply = useCallback(
        (snapshot: TableStateSnapshot) => {
            restoring.current = true
            restoreTableState(latest.current.bindings.table, snapshot)
            if (snapshot.state.showFilters !== undefined)
                latest.current.bindings.setShowFilters(
                    snapshot.state.showFilters,
                )
            if (snapshot.state.rowOrder !== undefined)
                latest.current.bindings.restoreRowOrder(snapshot.state.rowOrder)
            latest.current.options?.onRestore?.(snapshot)
            renderRestoredState((previous) => previous + 1)
        },
        [restoring],
    )

    useLayoutEffect(() => {
        const session = sessionRef.current
        if (
            revision > 0 &&
            session?.initializing &&
            session.active &&
            session.scope === scope
        ) {
            session.initializing = false
            session.ready = true
            session.baseline = getState()
            session.finishRestore?.()
            session.finishRestore = undefined
            setError(null)
            setStatus('ready')
            schedule(session, session.baseline)
        }
        restoring.current = false
    }, [scope, getState, schedule, revision])

    const load = useCallback(
        async (session: TablePersistenceSession) => {
            const generation = ++session.generation
            session.abort?.abort()
            session.finishRestore?.()
            session.finishRestore = undefined
            session.abort = new AbortController()
            session.ready = false
            session.initializing = false
            session.dirty.clear()
            session.baseline = getState()
            session.pending = undefined
            if (session.timer !== undefined) clearTimeout(session.timer)
            if (session.active) {
                setActiveScope(session.scope)
                setError(null)
                setStatus('loading')
            }
            try {
                await writes.current
                if (!session.active || generation !== session.generation) return
                const stored = await getAdapter(session).load(
                    session.key,
                    session.abort.signal,
                )
                if (!session.active || generation !== session.generation) return
                observe(session)
                const snapshot =
                    stored == null
                        ? null
                        : normalizeTableStateSnapshot(
                              stored,
                              session.options.fields,
                          )
                if (stored != null && !snapshot)
                    throw new Error(
                        'The saved table state has an unsupported version or invalid data',
                    )
                session.lastWritten = snapshot
                    ? JSON.stringify(snapshot)
                    : undefined
                session.lastQueued = undefined
                const applied = snapshot
                    ? createTableStateSnapshot(
                          Object.fromEntries(
                              Object.entries(snapshot.state).filter(
                                  ([field]) =>
                                      !session.dirty.has(
                                          field as TableStateField,
                                      ),
                              ),
                          ),
                          session.options.fields,
                      )
                    : null
                const committed = new Promise<void>((resolve) => {
                    session.finishRestore = resolve
                })
                session.initializing = true
                if (applied) apply(applied)
                else renderRestoredState((previous) => previous + 1)
                await committed
            } catch (cause) {
                if (!session.active || generation !== session.generation) return
                session.initializing = false
                restoring.current = false
                report(session, cause, 'load')
                throw cause
            }
        },
        [getState, observe, apply, report, restoring, getAdapter],
    )

    useEffect(() => {
        if (!scope) return
        const configuration = latest.current.options
        if (!configuration) return
        const storage = configuration.storage ?? 'local'
        const session: TablePersistenceSession = {
            scope,
            key: configuration.key,
            options: configuration,
            adapter:
                typeof storage === 'string'
                    ? createBrowserTableStateStorage(storage)
                    : storage,
            browser: typeof storage === 'string',
            active: true,
            ready: false,
            initializing: false,
            generation: 0,
            loading: Promise.resolve(),
            baseline: getState(),
            dirty: new Set(),
        }
        sessionRef.current = session
        // Observe after React commits options, so a table/key change cannot save new data under the old key.
        let queued = false
        const changed = () => {
            if (queued) return
            queued = true
            queueMicrotask(() => {
                queued = false
                observe(session)
            })
        }
        const subscriptions = [
            atoms.sorting,
            atoms.columnFilters,
            atoms.globalFilter,
            atoms.columnVisibility,
            atoms.columnSizing,
            atoms.columnOrder,
            atoms.pagination,
            atoms.rowSelection,
            atoms.expanded,
        ].map((atom) => atom.subscribe(changed))
        session.loading = load(session)
        session.loading.catch(() => {})
        const pageHide = () => {
            if (
                !session.ready ||
                !session.active ||
                latest.current.scope !== session.scope
            )
                return
            const snapshot = getState()
            if (session.browser) {
                if (session.cleared === JSON.stringify(snapshot)) return
                // Browser storage is synchronous; commit before a real reload can discard a debounce timer.
                if (session.timer !== undefined) clearTimeout(session.timer)
                session.pending = undefined
                try {
                    session.adapter.save(session.key, snapshot)
                    session.lastWritten = JSON.stringify(snapshot)
                } catch (cause) {
                    report(session, cause, 'save')
                }
            } else enqueue(session, snapshot).catch(() => {})
        }
        window.addEventListener('pagehide', pageHide)
        return () => {
            session.active = false
            session.abort?.abort()
            session.finishRestore?.()
            if (session.timer !== undefined) clearTimeout(session.timer)
            for (const subscription of subscriptions) subscription.unsubscribe()
            window.removeEventListener('pagehide', pageHide)
            if (session.ready && session.pending)
                enqueue(session, session.pending).catch(() => {})
            if (sessionRef.current === session) sessionRef.current = null
        }
    }, [scope, atoms, getState, load, observe, enqueue, report])

    useEffect(() => {
        const session = sessionRef.current
        if (
            session &&
            (showFilters !== session.baseline.state.showFilters ||
                JSON.stringify(rowOrder) !==
                    JSON.stringify(session.baseline.state.rowOrder))
        )
            observe(session)
    }, [showFilters, rowOrder, observe])

    const restoreState = useCallback(
        (value: unknown) => {
            const snapshot = normalizeTableStateSnapshot(
                value,
                latest.current.options?.fields,
            )
            if (!snapshot) return false
            const session = sessionRef.current
            if (session) {
                session.generation++
                session.abort?.abort()
                session.finishRestore?.()
                session.ready = false
                session.initializing = true
                if (session.timer !== undefined) clearTimeout(session.timer)
                session.pending = undefined
                session.cleared = undefined
                session.lastQueued = undefined
                session.lastWritten = undefined
                session.loading = new Promise<void>((resolve) => {
                    session.finishRestore = resolve
                })
            }
            apply(snapshot)
            return true
        },
        [apply],
    )

    const flush = useCallback(async () => {
        const session = sessionRef.current
        if (!session) return
        await session.loading
        if (!session.active || !session.ready) return
        if (session.timer !== undefined) clearTimeout(session.timer)
        session.pending = undefined
        await enqueue(session, getState())
    }, [enqueue, getState])

    const clear = useCallback(async () => {
        const session = sessionRef.current
        if (!session) return
        session.generation++
        session.abort?.abort()
        session.finishRestore?.()
        session.loading = Promise.resolve()
        session.initializing = false
        session.ready = true
        if (session.timer !== undefined) clearTimeout(session.timer)
        session.pending = undefined
        session.baseline = getState()
        session.lastQueued = JSON.stringify(session.baseline)
        session.cleared = session.lastQueued
        const job = writes.current.then(() => {
            const adapter = getAdapter(session)
            return adapter.remove
                ? adapter.remove(session.key)
                : adapter.save(session.key, { version: 1, state: {} })
        })
        writes.current = job.catch(() => {})
        try {
            await job
            if (session.active) {
                setError(null)
                setStatus('ready')
            }
        } catch (cause) {
            report(session, cause, 'remove')
            throw cause
        }
    }, [getState, report, getAdapter])

    const reload = useCallback(() => {
        const session = sessionRef.current
        if (!session) return Promise.resolve()
        session.loading = load(session)
        return session.loading
    }, [load])

    useImperativeHandle(
        stateRef,
        () => ({ getState, restoreState, flush, clear, reload }),
        [getState, restoreState, flush, clear, reload],
    )
    return {
        state: {
            status: !scope
                ? 'disabled'
                : activeScope !== scope
                  ? 'loading'
                  : status,
            error: scope ? error : null,
        },
        handler: { getState, restoreState, flush, clear, reload },
        refs: { restoring },
    }
}

/** Persisted filter values must be JSON-compatible. Unsupported custom values are omitted. */
export type TableStateValue =
    | null
    | boolean
    | number
    | string
    | TableStateValue[]
    | { [key: string]: TableStateValue }

/** Versioned preferences, never full application records or transient drag state. */
export type TableStateSnapshot = {
    version: 1
    state: Partial<{
        sorting: { id: string; desc: boolean }[]
        columnFilters: { id: string; value: TableStateValue }[]
        globalFilter: string
        columnVisibility: Record<string, boolean>
        columnSizing: Record<string, number>
        columnOrder: string[]
        pagination: { pageIndex: number; pageSize: number }
        rowSelection: Record<string, boolean>
        expanded: true | Record<string, boolean>
        showFilters: boolean
        /** Internal order only. With onRowOrderChange, the application owns persistence of data order. */
        rowOrder: string[]
    }>
}

export type TableStateField = keyof TableStateSnapshot['state']

export type TableStateStorage = {
    /** Return a snapshot or null; abort obsolete requests when a signal is supplied. */
    load: (key: string, signal?: AbortSignal) => unknown | Promise<unknown>
    /** Saves are debounced and serialized so slow writes cannot overwrite newer changes. */
    save: (key: string, snapshot: TableStateSnapshot) => void | Promise<void>
    remove?: (key: string) => void | Promise<void>
}

export type TablePersistenceOptions = {
    /** Use a distinct key per table and user/account. Callback identity changes do not reload this key. */
    key: string
    /** Defaults to local browser storage; supply an adapter for a database or another backend. */
    storage?: 'local' | 'session' | TableStateStorage
    /** Allowlist of saved/restored fields. Omit to include every supported preference. */
    fields?: readonly TableStateField[]
    /** Defaults to 250 ms. Browser storage also flushes synchronously on pagehide. */
    debounceMs?: number
    onError?: (
        error: unknown,
        context: { operation: 'load' | 'save' | 'remove'; key: string },
    ) => void
    onRestore?: (snapshot: TableStateSnapshot) => void
}

export type TableStateController = {
    /** Export a detached, validated snapshot, also available when automatic persistence is disabled. */
    getState: () => TableStateSnapshot
    /** Restore a valid partial snapshot through native controlled-state callbacks. */
    restoreState: (snapshot: unknown) => boolean
    /** Await queued saves before application navigation when using an asynchronous backend. */
    flush: () => Promise<void>
    /** Clear stored preferences without resetting the current UI; falls back to saving an empty snapshot. */
    clear: () => Promise<void>
    /** Retry loading the current key, including after a storage error. */
    reload: () => Promise<void>
}

export type TablePersistenceStatus = 'disabled' | 'loading' | 'ready' | 'error'

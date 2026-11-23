import type { Ref, RefObject } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance } from './table.types.ts'
import type {
    TablePersistenceOptions,
    TablePersistenceStatus,
    TableStateController,
    TableStateField,
    TableStateSnapshot,
    TableStateStorage,
} from './persistence.types.ts'

export interface TablePersistenceBindings<TData extends RowData> {
    table: RentnerTableInstance<TData>
    persistence: false | string | TablePersistenceOptions | undefined
    stateRef?: Ref<TableStateController>
    showFilters: boolean
    setShowFilters: (value: boolean) => void
    rowOrder: readonly string[] | undefined
    restoreRowOrder: (ids: readonly string[]) => void
}

export interface TablePersistenceSession {
    scope: string
    key: string
    adapter: TableStateStorage
    browser: boolean
    options: TablePersistenceOptions
    active: boolean
    ready: boolean
    initializing: boolean
    generation: number
    abort?: AbortController
    loading: Promise<void>
    finishRestore?: () => void
    baseline: TableStateSnapshot
    baselineSignature?: string
    observed: Record<TableStateField, unknown>
    dirty: Set<TableStateField>
    pending?: TableStateSnapshot
    pendingSignature?: string
    timer?: ReturnType<typeof setTimeout>
    lastQueued?: string
    lastWritten?: string
    cleared?: string
}

export interface TablePersistenceLogicResult {
    state: { status: TablePersistenceStatus; error: unknown }
    handler: TableStateController
    refs: { restoring: RefObject<boolean> }
}

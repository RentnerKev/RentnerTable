import type { RefObject } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { RentnerTableInstance, TableLocale } from './table.types.ts'
import type { TablePersistenceStatus } from './persistence.types.ts'

export interface TableColumnLayout {
    columnOrder: string[]
    columnVisibility: Record<string, boolean>
    columnSizing: Record<string, number>
}

export interface TableColumnSettingsMessages {
    title: string
    description: string
    visible: string
    width: string
    moveUp: (label: string) => string
    moveDown: (label: string) => string
    reset: string
    apply: string
    cancel: string
    close: string
    saving: string
    loading: string
    retry: string
    storageError: string
    saveError: string
    invalidWidth: string
}

export interface TableColumnSettingsProps<TData extends RowData> {
    table: RentnerTableInstance<TData>
    locale?: TableLocale
    messages?: Partial<TableColumnSettingsMessages>
    disabled?: boolean
    className?: string
    /** Change with the table/account preference key to discard an obsolete draft. */
    scope?: string
    persistenceStatus?: TablePersistenceStatus
    persistenceError?: unknown
    /** Await application-owned persistence before closing a confirmed layout. */
    onFlush?: () => Promise<void>
    onReload?: () => Promise<void>
}

export interface TableColumnSetting {
    id: string
    label: string
    visible: boolean
    width: number
    min: number
    max: number
    canHide: boolean
    canResize: boolean
}

export interface TableColumnSettingsLogicResult {
    state: {
        open: boolean
        rows: TableColumnSetting[]
        messages: TableColumnSettingsMessages
        saving: boolean
        error: 'save' | 'reload' | null
        valid: boolean
        unavailable: boolean
        storageError: boolean
    }
    handler: {
        handleOpen: () => void
        handleCancel: () => void
        handleReset: () => void
        handleMove: (id: string, direction: -1 | 1) => void
        handleVisibility: (id: string, visible: boolean) => void
        handleWidth: (id: string, value: string) => void
        handleApply: () => void
        handleRetry: () => void
    }
    refs: {
        dialog: RefObject<HTMLDialogElement | null>
        trigger: RefObject<HTMLButtonElement | null>
    }
}

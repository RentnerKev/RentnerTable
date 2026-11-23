import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { RowData } from '@tanstack/react-table'
import {
    applyTableColumnLayout,
    getTableColumnSettings,
    isTableColumnLayoutValid,
    readTableColumnLayout,
} from '../../../lib/Table/columnSettings.ts'
import { columnSettingsMessages } from '../../../lib/Messages/columnSettingsMessages.ts'
import type {
    TableColumnLayout,
    TableColumnSettingsLogicResult,
    TableColumnSettingsProps,
} from '../Types/columnSettings.types.ts'

export function useTableColumnSettingsLogic<TData extends RowData>(
    props: TableColumnSettingsProps<TData>,
): TableColumnSettingsLogicResult {
    const {
        table,
        locale = 'en',
        messages: overrides,
        scope = '',
        persistenceStatus,
    } = props
    const [draft, setDraft] = useState<TableColumnLayout | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<'save' | 'reload' | null>(null)
    const dialog = useRef<HTMLDialogElement | null>(null)
    const trigger = useRef<HTMLButtonElement | null>(null)
    const generation = useRef(0)
    const busy = useRef(false)
    const previousScope = useRef(scope)
    const messages = useMemo(() => {
        const base = columnSettingsMessages[locale]
        if (!overrides) return base
        let merged: typeof base | undefined
        for (const [key, value] of Object.entries(overrides)) {
            if (value !== undefined) {
                if (!merged) merged = { ...base }
                ;(merged as unknown as Record<string, unknown>)[key] = value
            }
        }
        return merged ?? base
    }, [locale, overrides])
    const rows = draft ? getTableColumnSettings(table, draft) : []
    const valid = isTableColumnLayoutValid(rows)
    const unavailable =
        Boolean(props.disabled) ||
        persistenceStatus === 'loading' ||
        table.getAllLeafColumns().length === 0
    useLayoutEffect(() => {
        if (previousScope.current !== scope) {
            previousScope.current = scope
            generation.current++
            busy.current = false
            setSaving(false)
            setDraft(null)
            setError(null)
        }
    }, [scope])
    useLayoutEffect(() => {
        const node = dialog.current
        if (!node) return
        if (draft && !node.open) node.showModal()
        if (!draft && node.open) {
            node.close()
            trigger.current?.focus({ preventScroll: true })
        }
    }, [draft])
    useLayoutEffect(
        () => () => {
            generation.current++
        },
        [],
    )

    function handleCancel() {
        generation.current++
        busy.current = false
        setSaving(false)
        setDraft(null)
        setError(null)
    }
    function updateDraft(
        update: (current: TableColumnLayout) => TableColumnLayout,
    ) {
        if (unavailable || busy.current) return
        setDraft((current) => (current ? update(current) : null))
        setError(null)
    }
    async function apply() {
        if (!draft || busy.current || unavailable || !valid) return
        busy.current = true
        const request = ++generation.current
        setSaving(true)
        setError(null)
        try {
            // Commit controlled React slices before flushing the persistence adapter.
            flushSync(() => {
                applyTableColumnLayout(table, draft)
            })
            await props.onFlush?.()
            if (generation.current === request) setDraft(null)
        } catch {
            if (generation.current === request) setError('save')
        } finally {
            if (generation.current === request) {
                busy.current = false
                setSaving(false)
            }
        }
    }
    async function retry() {
        if (!props.onReload || busy.current) return
        const request = ++generation.current
        busy.current = true
        setSaving(true)
        setError(null)
        try {
            await props.onReload()
            if (generation.current === request) {
                setError(null)
                setDraft(readTableColumnLayout(table))
            }
        } catch {
            if (generation.current === request) setError('reload')
        } finally {
            if (generation.current === request) {
                busy.current = false
                setSaving(false)
            }
        }
    }
    return {
        state: {
            open: draft !== null,
            rows,
            messages,
            saving,
            error,
            valid,
            unavailable,
            storageError:
                persistenceStatus === 'error' ||
                Boolean(props.persistenceError),
        },
        handler: {
            handleOpen: () => {
                if (unavailable || busy.current) return
                generation.current++
                setError(null)
                setDraft(readTableColumnLayout(table))
            },
            handleCancel,
            handleReset: () =>
                updateDraft(() => readTableColumnLayout(table, true)),
            handleMove: (id, direction) =>
                updateDraft((current) => {
                    const order = getTableColumnSettings(table, current).map(
                        (row) => row.id,
                    )
                    const from = order.indexOf(id)
                    const to = from + direction
                    if (from < 0 || to < 0 || to >= order.length) return current
                    const moved = order[from]
                    order[from] = order[to]
                    order[to] = moved
                    return { ...current, columnOrder: order }
                }),
            handleVisibility: (id, visible) =>
                updateDraft((current) => {
                    const currentRows = getTableColumnSettings(table, current)
                    const row = currentRows.find((item) => item.id === id)
                    if (
                        !row?.canHide ||
                        (!visible &&
                            currentRows.filter((item) => item.visible).length <=
                                1)
                    )
                        return current
                    return {
                        ...current,
                        columnVisibility: {
                            ...current.columnVisibility,
                            [id]: visible,
                        },
                    }
                }),
            handleWidth: (id, value) =>
                updateDraft((current) => {
                    const column = table.getColumn(id)
                    if (
                        !column ||
                        column.columns.length > 0 ||
                        !column.getCanResize()
                    )
                        return current
                    return {
                        ...current,
                        columnSizing: {
                            ...current.columnSizing,
                            [id]: value.trim() ? Number(value) : Number.NaN,
                        },
                    }
                }),
            handleApply: () => {
                void apply()
            },
            handleRetry: () => {
                void retry()
            },
        },
        refs: { dialog, trigger },
    }
}

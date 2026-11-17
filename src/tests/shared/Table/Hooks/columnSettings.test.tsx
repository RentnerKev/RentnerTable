import { afterEach, describe, expect, mock, test } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { createTableColumnHelper } from '../../../../lib/Table/table.ts'
import { useDataTableLogic } from '../../../../shared/Table/Hooks/useDataTableLogic.ts'
import { useTableColumnSettingsLogic } from '../../../../shared/Table/Hooks/useTableColumnSettingsLogic.ts'
import { applyTableColumnLayout, readTableColumnLayout } from '../../../../lib/Table/columnSettings.ts'
import type { TableStateSnapshot, TableStateStorage } from '../../../../shared/Table/Types/persistence.types.ts'

afterEach(cleanup)
interface Entry { id: string; name: string; role: string }
const helper = createTableColumnHelper<Entry>()
const columns = helper.columns([
    helper.accessor('name', { header: 'Name', size: 180, minSize: 100, maxSize: 400, enableHiding: false }),
    helper.accessor('role', { header: 'Role', size: 120, minSize: 80, maxSize: 300 }),
])
const base = { data: [{ id: 'a', name: 'Alpha', role: 'Developer' }], columns, getRowId: (row: Entry) => row.id, resizableColumns: true }

describe('isolated column layout drafts', () => {
    test('cancel discards order, visibility and widths without touching the table', () => {
        const { result } = renderHook(() => {
            const logic = useDataTableLogic(base)
            return { table: logic.table, settings: useTableColumnSettingsLogic({ table: logic.table }) }
        })
        const initial = readTableColumnLayout(result.current.table)
        act(() => result.current.settings.handler.handleOpen())
        act(() => {
            result.current.settings.handler.handleMove('role', -1)
            result.current.settings.handler.handleVisibility('role', false)
            result.current.settings.handler.handleWidth('name', '260')
        })
        expect(result.current.settings.state.rows.map((row) => row.id)).toEqual(['role', 'name'])
        expect(readTableColumnLayout(result.current.table)).toEqual(initial)
        act(() => result.current.settings.handler.handleCancel())
        expect(result.current.settings.state.open).toBe(false)
        expect(readTableColumnLayout(result.current.table)).toEqual(initial)
    })

    test('reset restores configured sizes in the draft and respects fixed capabilities', () => {
        const fixed = helper.columns([
            helper.accessor('name', { header: 'Name', size: 180, enableHiding: false }),
            helper.accessor('role', { header: 'Role', size: 120, enableResizing: false }),
        ])
        const { result } = renderHook(() => {
            const logic = useDataTableLogic({ ...base, columns: fixed })
            return { table: logic.table, settings: useTableColumnSettingsLogic({ table: logic.table }) }
        })
        act(() => {
            result.current.table.setColumnSizing({ name: 300, role: 220 })
            result.current.table.setColumnOrder(['role', 'name'])
            result.current.table.setColumnVisibility({ role: false })
        })
        act(() => result.current.settings.handler.handleOpen())
        act(() => result.current.settings.handler.handleReset())
        expect(result.current.settings.state.rows.map((row) => [row.id, row.width, row.visible])).toEqual([
            ['name', 180, true], ['role', 220, true],
        ])
        expect(result.current.table.state.columnSizing).toEqual({ name: 300, role: 220 })
        act(() => result.current.settings.handler.handleVisibility('name', false))
        act(() => result.current.settings.handler.handleWidth('role', '999'))
        expect(result.current.settings.state.rows[0].visible).toBe(true)
        expect(result.current.settings.state.rows[1].width).toBe(220)
    })

    test('invalid or empty widths prevent applying and the last visible column stays visible', () => {
        const { result } = renderHook(() => {
            const logic = useDataTableLogic({ ...base, columns: helper.columns([
                helper.accessor('name', { header: 'Name', minSize: 100, maxSize: 400 }),
                helper.accessor('role', { header: 'Role' }),
            ]) })
            return { table: logic.table, settings: useTableColumnSettingsLogic({ table: logic.table }) }
        })
        act(() => result.current.settings.handler.handleOpen())
        act(() => result.current.settings.handler.handleVisibility('role', false))
        act(() => result.current.settings.handler.handleVisibility('name', false))
        expect(result.current.settings.state.rows.filter((row) => row.visible)).toHaveLength(1)
        act(() => result.current.settings.handler.handleWidth('name', ''))
        expect(result.current.settings.state.valid).toBe(false)
        act(() => result.current.settings.handler.handleApply())
        expect(result.current.table.state.columnVisibility).toEqual({})
        act(() => result.current.settings.handler.handleWidth('name', '401'))
        expect(result.current.settings.state.valid).toBe(false)
        act(() => result.current.settings.handler.handleWidth('name', '250'))
        expect(result.current.settings.state.valid).toBe(true)
    })

    test('applies controlled slices together before flushing the actual persisted snapshot', async () => {
        const snapshots: TableStateSnapshot[] = []
        const storage: TableStateStorage = { load: () => null, save: (_key, value) => { snapshots.push(value) } }
        const { result } = renderHook(() => {
            const [columnOrder, setColumnOrder] = useState<string[]>([])
            const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
            const [columnSizing, setColumnSizing] = useState<Record<string, number>>({})
            const logic = useDataTableLogic({
                ...base,
                tableOptions: { state: { columnOrder, columnVisibility, columnSizing }, onColumnOrderChange: setColumnOrder, onColumnVisibilityChange: setColumnVisibility, onColumnSizingChange: setColumnSizing },
                persistence: { key: 'columns', storage, fields: ['columnOrder', 'columnVisibility', 'columnSizing'], debounceMs: 60_000 },
            })
            const settings = useTableColumnSettingsLogic({ table: logic.table, persistenceStatus: logic.state.persistenceStatus, onFlush: logic.handler.handleFlushState })
            return { logic, settings }
        })
        await waitFor(() => expect(result.current.logic.state.persistenceStatus).toBe('ready'))
        snapshots.length = 0
        act(() => result.current.settings.handler.handleOpen())
        act(() => {
            result.current.settings.handler.handleMove('role', -1)
            result.current.settings.handler.handleVisibility('role', false)
            result.current.settings.handler.handleWidth('name', '260')
        })
        await act(async () => { result.current.settings.handler.handleApply() })
        await waitFor(() => expect(result.current.settings.state.open).toBe(false))
        expect(snapshots).toHaveLength(1)
        expect(snapshots[0].state).toEqual({ columnOrder: ['role', 'name'], columnVisibility: { role: false, name: true }, columnSizing: { role: 120, name: 260 } })
    })

    test('save errors keep the confirmed layout open for retry and a scope change cancels stale completion', async () => {
        let rejectSave: ((error: Error) => void) | undefined
        const flush = mock(() => new Promise<void>((_resolve, reject) => { rejectSave = reject }))
        const { result, rerender } = renderHook(({ scope }) => {
            const logic = useDataTableLogic(base)
            return useTableColumnSettingsLogic({ table: logic.table, scope, onFlush: flush })
        }, { initialProps: { scope: 'account-a' } })
        act(() => result.current.handler.handleOpen())
        act(() => result.current.handler.handleApply())
        expect(result.current.state.saving).toBe(true)
        act(() => result.current.handler.handleApply())
        expect(flush).toHaveBeenCalledTimes(1)
        await act(async () => rejectSave?.(new Error('offline')))
        expect(result.current.state.error).toBe('save')
        expect(result.current.state.open).toBe(true)
        act(() => result.current.handler.handleApply())
        rerender({ scope: 'account-b' })
        expect(result.current.state.open).toBe(false)
        await act(async () => rejectSave?.(new Error('obsolete')))
        expect(result.current.state.error).toBeNull()
        expect(result.current.state.saving).toBe(false)
    })

    test('reconciles changed column definitions and rejects an invalid direct layout before any mutation', () => {
        const { result, rerender } = renderHook(({ extended }) => {
            const logic = useDataTableLogic({ ...base, columns: extended ? helper.columns([helper.accessor('name', { header: 'Name' }), helper.accessor('id', { header: 'ID' })]) : columns })
            return { table: logic.table, settings: useTableColumnSettingsLogic({ table: logic.table }) }
        }, { initialProps: { extended: false } })
        act(() => result.current.settings.handler.handleOpen())
        rerender({ extended: true })
        expect(result.current.settings.state.rows.map((row) => row.id)).toEqual(['name', 'id'])
        const previous = readTableColumnLayout(result.current.table)
        expect(applyTableColumnLayout(result.current.table, { columnOrder: ['id', 'removed', 'name', 'id'], columnVisibility: { id: false, name: false }, columnSizing: {} })).toBe(false)
        expect(readTableColumnLayout(result.current.table)).toEqual(previous)
    })

    test('repeated reload failures remain reload errors and keep recovery possible', async () => {
        const reload = mock(async () => { throw new Error('unavailable') })
        const { result } = renderHook(() => {
            const logic = useDataTableLogic(base)
            return useTableColumnSettingsLogic({ table: logic.table, persistenceStatus: 'error', onReload: reload })
        })
        act(() => result.current.handler.handleOpen())
        await act(async () => result.current.handler.handleRetry())
        expect(result.current.state.error).toBe('reload')
        expect(result.current.state.open).toBe(true)
        await act(async () => result.current.handler.handleRetry())
        expect(reload).toHaveBeenCalledTimes(2)
        expect(result.current.state.error).toBe('reload')
        expect(result.current.state.saving).toBe(false)
    })
})

import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { createTableColumnHelper } from '../../../../lib/Table/table.ts'
import { useDataTableLogic } from '../../../../shared/Table/Hooks/useDataTableLogic.ts'
import { useTableColumnResizeLogic } from '../../../../shared/Table/Hooks/useTableColumnResizeLogic.ts'

afterEach(cleanup)

interface Member {
    id: string
    name: string
    role: string
}
const helper = createTableColumnHelper<Member>()
const columns = helper.columns([
    helper.accessor('name', { header: 'Name', size: 180 }),
    helper.accessor('role', { header: 'Role', size: 120 }),
])
const data = [{ id: 'one', name: 'Kevin', role: 'Engineer' }]
const getRowId = (member: Member) => member.id

describe('column resize layout caching', () => {
    test('reuses widths for selection and search but refreshes sizing and visibility', () => {
        const { result } = renderHook(() => {
            const { table } = useDataTableLogic({
                data,
                columns,
                getRowId,
                selectable: true,
                resizableColumns: true,
            })
            const sizing = useTableColumnResizeLogic(table, true, 48)
            return { table, sizing }
        })
        const initial = result.current.sizing.state.widths
        expect(initial).toEqual([
            { id: 'name', width: 180 },
            { id: 'role', width: 120 },
        ])
        act(() => result.current.table.setRowSelection({ one: true }))
        expect(result.current.sizing.state.widths).toBe(initial)
        act(() => result.current.table.setGlobalFilter('Kevin'))
        expect(result.current.sizing.state.widths).toBe(initial)
        act(() => result.current.table.setColumnSizing({ name: 240 }))
        expect(result.current.sizing.state.widths).toEqual([
            { id: 'name', width: 240 },
            { id: 'role', width: 120 },
        ])
        expect(result.current.sizing.state.width).toBe(408)
        act(() => result.current.table.setColumnVisibility({ role: false }))
        expect(result.current.sizing.state.widths).toEqual([
            { id: 'name', width: 240 },
        ])
    })

    test('keeps disabled sizing values and refreshes them when resizing is enabled', () => {
        const { result, rerender } = renderHook(
            ({ enabled, extraWidth }) => {
                const { table } = useDataTableLogic({
                    data,
                    columns,
                    resizableColumns: enabled,
                })
                return useTableColumnResizeLogic(table, enabled, extraWidth)
            },
            { initialProps: { enabled: false, extraWidth: 0 } },
        )
        expect(result.current.state.fixed).toBe(false)
        expect(result.current.state.width).toBe(300)
        expect(result.current.state.widths).toEqual([
            { id: 'name', width: 180 },
            { id: 'role', width: 120 },
        ])
        rerender({ enabled: true, extraWidth: 48 })
        expect(result.current.state.width).toBe(348)
    })
})

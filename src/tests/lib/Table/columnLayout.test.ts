import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { createTableColumnHelper } from '../../../lib/Table/table.ts'
import {
    getColumnLayoutResizeBounds,
    getTableColumnLayout,
    getTableColumnMinimumWidth,
} from '../../../lib/Table/columnLayout.ts'
import { getColumnResizeMaximum } from '../../../lib/Table/columnSizing.ts'
import type { ResizeColumn } from '../../../lib/Table/columnSizing.ts'
import { useDataTableLogic } from '../../../shared/Table/Hooks/useDataTableLogic.ts'

afterEach(cleanup)

interface Member {
    name: string
    role: string
}
const helper = createTableColumnHelper<Member>()
const columns = helper.columns([
    helper.accessor('name', { size: 180 }),
    helper.accessor('role', { size: 120 }),
])
const data = [{ name: 'Kevin', role: 'Engineer' }]
const options = { data, columns, resizableColumns: true }

describe('shared fitted column layouts', () => {
    test('shares one fitted result across handles and unrelated table state updates', () => {
        const { result } = renderHook(() => useDataTableLogic(options))
        const initial = getTableColumnLayout(result.current.table, 600)
        expect(initial.map((column) => column.size)).toEqual([360, 240])
        const name = result.current.table.getVisibleLeafColumns()[0]
        if (!name) throw new Error('Expected the name column')
        const measure = spyOn(name, 'getSize')
        try {
            for (let index = 0; index < 20; index++)
                expect(getTableColumnLayout(result.current.table, 600)).toBe(
                    initial,
                )
            expect(measure).not.toHaveBeenCalled()
            act(() => result.current.table.setGlobalFilter('Kevin'))
            expect(getTableColumnLayout(result.current.table, 600)).toBe(
                initial,
            )
        } finally {
            measure.mockRestore()
        }
    })

    test('invalidates width, sizing, visibility and column order while preserving frozen preferences', () => {
        const sizing = Object.freeze({ name: 240 })
        const { result } = renderHook(() => useDataTableLogic(options))
        const initial = getTableColumnLayout(result.current.table, 600)
        const narrow = getTableColumnLayout(result.current.table, 300)
        expect(narrow).not.toBe(initial)
        expect(narrow.map((column) => column.size)).toEqual([180, 120])
        act(() => result.current.table.setColumnSizing(sizing))
        expect(
            getTableColumnLayout(result.current.table, 600).map(
                (column) => column.size,
            ),
        ).toEqual([240, 120])
        expect(sizing).toEqual({ name: 240 })
        act(() => result.current.table.setColumnOrder(['role', 'name']))
        expect(
            getTableColumnLayout(result.current.table, 600).map(
                (column) => column.id,
            ),
        ).toEqual(['role', 'name'])
        act(() => result.current.table.setColumnVisibility({ role: false }))
        expect(
            getTableColumnLayout(result.current.table, 600).map(
                (column) => column.id,
            ),
        ).toEqual(['name'])
    })

    test('keeps independent tables sharing column definitions and defaults separate', () => {
        const first = renderHook(() => useDataTableLogic(options))
        const second = renderHook(() =>
            useDataTableLogic({
                ...options,
                tableOptions: { state: { columnSizing: { name: 270 } } },
            }),
        )
        const firstLayout = getTableColumnLayout(
            first.result.current.table,
            600,
        )
        const secondLayout = getTableColumnLayout(
            second.result.current.table,
            600,
        )
        expect(firstLayout.map((column) => column.size)).toEqual([360, 240])
        expect(secondLayout.map((column) => column.size)).toEqual([270, 120])
        expect(getTableColumnLayout(first.result.current.table, 600)).toBe(
            firstLayout,
        )
        expect(getTableColumnLayout(second.result.current.table, 600)).toBe(
            secondLayout,
        )
    })

    test('honors default bounds, fixed columns and changes to resizing options', () => {
        const boundedColumns = helper.columns([
            helper.accessor('name', { size: 180 }),
            helper.accessor('role', { size: 100, enableResizing: false }),
        ])
        const { result, rerender } = renderHook(
            ({ enabled }) =>
                useDataTableLogic({
                    ...options,
                    columns: boundedColumns,
                    resizableColumns: enabled,
                    tableOptions: {
                        defaultColumn: { minSize: 80, maxSize: 200 },
                    },
                }),
            { initialProps: { enabled: true } },
        )
        const initial = getTableColumnLayout(result.current.table, 600)
        expect(initial.map((column) => column.size)).toEqual([200, 100])
        expect(initial.map((column) => column.min)).toEqual([80, 80])
        expect(initial.map((column) => column.max)).toEqual([200, 200])
        rerender({ enabled: false })
        const disabled = getTableColumnLayout(result.current.table, 600)
        expect(disabled).not.toBe(initial)
        expect(disabled.map((column) => column.resizable)).toEqual([
            false,
            false,
        ])
        expect(disabled.map((column) => column.size)).toEqual([180, 100])
    })

    test('derives the scroll floor from visible leaves and keeps fixed sizing preferences', () => {
        const boundedColumns = helper.columns([
            helper.accessor('name', { size: 180.3, minSize: 80.1 }),
            helper.accessor('role', { size: 100, enableResizing: false }),
        ])
        const { result } = renderHook(() =>
            useDataTableLogic({ ...options, columns: boundedColumns }),
        )
        expect(getTableColumnMinimumWidth(result.current.table)).toBe(180.1)
        act(() => result.current.table.setColumnSizing({ role: 130 }))
        const minimum = getTableColumnMinimumWidth(result.current.table)
        expect(minimum).toBe(210.1)
        const layout = getTableColumnLayout(result.current.table, minimum)
        expect(layout.map((column) => column.size)).toEqual([80.1, 130])
        expect(getColumnLayoutResizeBounds(layout, minimum, 'name')).toEqual({
            column: layout[0],
            maximum: 80.1,
        })
        act(() => result.current.table.setColumnVisibility({ name: false }))
        expect(getTableColumnMinimumWidth(result.current.table)).toBe(130)
    })
})

describe('shared resize bounds', () => {
    const fitted: readonly ResizeColumn[] = Object.freeze([
        Object.freeze({
            id: 'first',
            size: 180.3,
            min: 80.1,
            max: 500,
            resizable: true,
        }),
        Object.freeze({
            id: 'fixed',
            size: 100,
            min: 40,
            max: 200,
            resizable: false,
        }),
        Object.freeze({
            id: 'third',
            size: 120.2,
            min: 70.7,
            max: 400,
            resizable: true,
        }),
        Object.freeze({
            id: 'last',
            size: 160.8,
            min: 60.4,
            max: 300,
            resizable: true,
        }),
    ])

    test('matches directional maxima for finite, infinite and invalid budgets without mutating inputs', () => {
        for (const available of [
            300,
            700,
            Number.POSITIVE_INFINITY,
            Number.NaN,
        ]) {
            for (const column of fitted) {
                const bounds = getColumnLayoutResizeBounds(
                    fitted,
                    available,
                    column.id,
                )
                expect(bounds?.column).toBe(column)
                const expected = getColumnResizeMaximum(
                    fitted,
                    available,
                    column.id,
                )
                if (Number.isNaN(expected)) expect(bounds?.maximum).toBeNaN()
                else expect(bounds?.maximum).toBeCloseTo(expected, 10)
            }
            expect(
                getColumnLayoutResizeBounds(fitted, available, 'missing'),
            ).toBeUndefined()
        }
    })

    test('reuses indexed bounds without traversing widths and invalidates changed budgets', () => {
        let reads = 0
        const observed = fitted.map((column) => ({
            ...column,
            get size() {
                reads++
                return column.size
            },
        }))
        const first = getColumnLayoutResizeBounds(observed, 700, 'first')
        reads = 0
        for (const column of fitted)
            expect(
                getColumnLayoutResizeBounds(observed, 700, column.id)?.column
                    .id,
            ).toBe(column.id)
        expect(getColumnLayoutResizeBounds(observed, 700, 'first')).toBe(first)
        expect(reads).toBe(0)
        const narrow = getColumnLayoutResizeBounds(observed, 300, 'first')
        expect(narrow).not.toBe(first)
        expect(narrow?.maximum).toBeLessThan(first?.maximum ?? 0)
        expect(reads).toBeGreaterThan(0)
    })
})

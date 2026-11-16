import { describe, expect, test } from 'bun:test'
import {
    fitColumnWidths,
    getColumnResizeMaximum,
    resizeColumnWidths,
} from '../../../lib/Table/columnSizing.ts'
import type { ResizeColumn } from '../../../lib/Table/columnSizing.ts'

const columns: ResizeColumn[] = [
    { id: 'name', size: 180, min: 80, max: 600, resizable: true },
    { id: 'role', size: 120, min: 60, max: 300, resizable: true },
    { id: 'actions', size: 60, min: 60, max: 60, resizable: false },
]

describe('bounded column sizing', () => {
    test('fills the viewport proportionally without growing fixed controls or changing input widths', () => {
        const fitted = fitColumnWidths(columns, 600, true)
        expect(fitted.map(column => column.size)).toEqual([324, 216, 60])
        expect(columns.map(column => column.size)).toEqual([180, 120, 60])
        expect(fitColumnWidths(columns, Infinity, true)).toEqual(columns)
        expect(fitColumnWidths(columns, 1200, true).map(column => column.size)).toEqual([600, 300, 60])
    })
    test('borrows only available peer space, respecting fixed columns and minima', () => {
        const next = resizeColumnWidths(columns, 360, 'name', 1000)
        expect(next).toEqual({ name: 240, role: 60, actions: 60 })
        expect(getColumnResizeMaximum(columns, 360, 'name')).toBe(240)
        expect(resizeColumnWidths(columns, 360, 'name', 1)).toEqual({
            name: 80,
            role: 120,
            actions: 60,
        })
    })
    test('consumes remaining viewport space before borrowing and honors maxSize', () => {
        expect(resizeColumnWidths(columns, 400, 'name', 220)).toEqual({
            name: 220,
            role: 120,
            actions: 60,
        })
        expect(resizeColumnWidths(columns, 1200, 'name', 1000).name).toBe(600)
        expect(resizeColumnWidths(columns, 400, 'actions', 100)).toEqual({})
    })
    test('fits oversized controlled preferences without mutating them', () => {
        const fitted = fitColumnWidths(columns, 240)
        expect(fitted.map((column) => column.size)).toEqual([105, 75, 60])
        expect(columns.map((column) => column.size)).toEqual([180, 120, 60])
        expect(
            fitColumnWidths(columns, 120).reduce(
                (sum, column) => sum + column.size,
                0,
            ),
        ).toBeCloseTo(120)
        expect(
            fitColumnWidths(columns, 0).every((column) => column.size === 0),
        ).toBe(true)
    })
    test('never grows beyond the viewport across repeated requests and narrow fallback widths', () => {
        for (const available of [120, 240, 360, 400, 1200]) {
            let current = columns
            for (const requested of [500, 1000, -100, 120, 500]) {
                const fitted = fitColumnWidths(current, available)
                const sizes = resizeColumnWidths(
                    fitted,
                    available,
                    'name',
                    requested,
                )
                expect(
                    Object.values(sizes).reduce((sum, size) => sum + size, 0),
                ).toBeLessThanOrEqual(available + 0.00001)
                current = fitted.map((column) =>
                    Object.assign(column, {
                        size: sizes[column.id] ?? column.size,
                    }),
                )
            }
        }
    })
})

describe('directional column resizing', () => {
    const tenColumns: ResizeColumn[] = Array.from(
        { length: 10 },
        (_, index) => ({
            id: 'column-' + index,
            size: 100,
            min: 60,
            max: 300,
            resizable: true,
        }),
    )

    test('keeps the first six columns fixed when growing or shrinking column seven', () => {
        for (const requested of [180, 60, 1000]) {
            const next = resizeColumnWidths(
                tenColumns,
                1000,
                'column-6',
                requested,
            )
            for (let index = 0; index < 6; index++) {
                expect(next['column-' + index]).toBe(100)
            }
            expect(next['column-6']).toBe(Math.min(220, requested))
            expect(
                Object.values(next).reduce((sum, width) => sum + width, 0),
            ).toBeLessThanOrEqual(1000.00001)
        }
        expect(tenColumns.every((column) => column.size === 100)).toBe(true)
    })

    test('ignores earlier capacity and fixed trailing columns when calculating the maximum', () => {
        const middle: ResizeColumn[] = [
            { id: 'before', size: 300, min: 60, max: 600, resizable: true },
            { id: 'active', size: 100, min: 60, max: 600, resizable: true },
            { id: 'fixed', size: 100, min: 60, max: 600, resizable: false },
            { id: 'after', size: 100, min: 80, max: 600, resizable: true },
        ]
        expect(getColumnResizeMaximum(middle, 600, 'active')).toBe(120)
        expect(resizeColumnWidths(middle, 600, 'active', 400)).toEqual({
            before: 300,
            active: 120,
            fixed: 100,
            after: 80,
        })
    })

    test('clamps the last column to free viewport space without borrowing from earlier columns', () => {
        expect(getColumnResizeMaximum(tenColumns, 1000, 'column-9')).toBe(100)
        expect(getColumnResizeMaximum(tenColumns, 1040, 'column-9')).toBe(140)
        const next = resizeColumnWidths(tenColumns, 1040, 'column-9', 200)
        expect(next['column-9']).toBe(140)
        for (let index = 0; index < 9; index++)
            expect(next['column-' + index]).toBe(100)
        expect(resizeColumnWidths(tenColumns, 1000, 'missing', 200)).toEqual({})
    })
})

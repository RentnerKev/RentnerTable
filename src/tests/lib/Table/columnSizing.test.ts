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

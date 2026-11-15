import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { createTableColumnHelper, DataTable } from '../../../../index.ts'

afterEach(cleanup)

interface Member {
    name: string
    role: string
    team: string
}
const helper = createTableColumnHelper<Member>()
const columns = helper.columns([
    helper.group({
        id: 'identity',
        header: 'Identity',
        columns: [
            helper.accessor('name', { header: 'Name' }),
            helper.accessor('role', { header: 'Role' }),
        ],
    }),
    helper.accessor('team', {
        header: 'Team',
        enableResizing: false,
        minSize: 80,
        size: 80,
    }),
])

describe('bounded resize interactions', () => {
    test('preserves controlled onEnd sizing, group leaves, inherited limits, RTL and touch cleanup', () => {
        const viewportWidth = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'clientWidth',
        )
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() {
                return this.hasAttribute('data-rentner-table-container')
                    ? 400
                    : 0
            },
        })
        const changes: Record<string, number>[] = []
        function Controlled() {
            const [sizing, setSizing] = useState<Record<string, number>>({
                name: 160,
                role: 160,
                team: 80,
            })
            return (
                <DataTable
                    data={[{ name: 'Kevin', role: 'Engineer', team: 'Core' }]}
                    columns={columns}
                    resizableColumns
                    tableOptions={{
                        defaultColumn: { minSize: 90, maxSize: 220, size: 110 },
                        columnResizeDirection: 'rtl',
                        columnResizeMode: 'onEnd',
                        state: { columnSizing: sizing },
                        onColumnSizingChange: (updater) =>
                            setSizing((current) => {
                                const next =
                                    typeof updater === 'function'
                                        ? updater(current)
                                        : updater
                                changes.push(next)
                                return next
                            }),
                    }}
                />
            )
        }
        try {
            const { unmount } = render(<Controlled />)
            expect(screen.getAllByRole('separator')).toHaveLength(2)
            const handle = screen.getByRole('separator', {
                name: 'Resize Name',
            })
            expect(handle.getAttribute('aria-valuemin')).toBe('90')
            expect(handle.getAttribute('aria-valuemax')).toBe('220')
            const count = changes.length
            expect(
                fireEvent.mouseDown(handle, { button: 0, clientX: 100 }),
            ).toBe(false)
            expect(document.activeElement).toBe(handle)
            fireEvent.mouseMove(document, { clientX: -1000 })
            expect(handle.getAttribute('data-resizing')).toBe('true')
            expect(changes).toHaveLength(count)
            fireEvent.mouseUp(document, { clientX: -1000 })
            expect(handle.hasAttribute('data-resizing')).toBe(false)
            expect(handle.getAttribute('aria-valuenow')).toBe('220')
            expect(changes.at(-1)).toEqual({ name: 220, role: 100, team: 80 })
            fireEvent.keyDown(handle, { key: 'Home' })
            expect(handle.getAttribute('aria-valuenow')).toBe('110')
            fireEvent.keyDown(handle, { key: 'ArrowLeft' })
            expect(handle.getAttribute('aria-valuenow')).toBe('120')
            fireEvent.touchStart(handle, { touches: [{ clientX: 100 }] })
            fireEvent.touchMove(document, { touches: [{ clientX: -1000 }] })
            const touchCount = changes.length
            fireEvent.touchCancel(document)
            expect(changes).toHaveLength(touchCount)
            expect(handle.hasAttribute('data-resizing')).toBe(false)
            fireEvent.touchStart(handle, { touches: [{ clientX: 100 }] })
            fireEvent.touchMove(document, { touches: [{ clientX: -1000 }] })
            fireEvent.touchEnd(document, {
                changedTouches: [{ clientX: -1000 }],
                touches: [],
            })
            expect(handle.getAttribute('aria-valuenow')).toBe('220')
            fireEvent.mouseDown(handle, { button: 0, clientX: 100 })
            unmount()
            const afterUnmount = changes.length
            fireEvent.mouseUp(document, { clientX: -1000 })
            expect(changes).toHaveLength(afterUnmount)
        } finally {
            if (viewportWidth)
                Object.defineProperty(
                    HTMLElement.prototype,
                    'clientWidth',
                    viewportWidth,
                )
            else Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
        }
    })
})

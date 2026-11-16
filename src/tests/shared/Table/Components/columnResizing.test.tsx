import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const resizeTableView = (
    roleVisible = true,
    selectable = false,
    maxSize = 1000,
) => (
    <DataTable
        data={[{ name: 'Kevin', role: 'Engineer', team: 'Core' }]}
        columns={maxSize === 1000 ? columns : [...columns]}
        resizableColumns
        selectable={selectable}
        renderExpandedRow={selectable ? () => <p>Details</p> : undefined}
        tableOptions={{
            defaultColumn: { minSize: 90, maxSize },
            state: { columnVisibility: { role: roleVisible } },
        }}
    />
)

describe('bounded resize interactions', () => {
    test('keeps resize observers connected while updating widths, visibility and utility columns', () => {
        const originalObserver = globalThis.ResizeObserver
        const viewportWidth = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'clientWidth',
        )
        let width = 600
        const observers: Observer[] = []
        class Observer implements ResizeObserver {
            disconnected = false
            constructor(readonly callback: ResizeObserverCallback) {
                observers.push(this)
            }
            observe() {}
            unobserve() {}
            disconnect() {
                this.disconnected = true
            }
        }
        globalThis.ResizeObserver = Observer
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() {
                return this.hasAttribute('data-rentner-table-container')
                    ? width
                    : 0
            },
        })
        try {
            const { rerender, unmount } = render(resizeTableView())
            const handle = screen.getByRole('separator', {
                name: 'Resize Name',
            })
            expect(handle.getAttribute('aria-valuemax')).toBe('430')
            const initial = observers.length
            expect(initial).toBe(1)
            for (let index = 0; index < 10; index++) rerender(resizeTableView())
            fireEvent.mouseDown(handle, { button: 0, clientX: 100 })
            for (let index = 0; index < 10; index++)
                fireEvent.mouseMove(document, { clientX: 100 + index * 10 })
            fireEvent.mouseUp(document, { clientX: 200 })
            expect(observers).toHaveLength(initial)
            expect(observers.every((observer) => !observer.disconnected)).toBe(
                true,
            )

            rerender(resizeTableView(false, true))
            expect(handle.getAttribute('aria-valuemax')).toBe('432')
            expect(observers).toHaveLength(initial)
            expect(
                observers.filter((observer) => observer.disconnected),
            ).toHaveLength(0)
            width = 400
            act(() => {
                for (const observer of observers)
                    if (!observer.disconnected) observer.callback([], observer)
            })
            expect(handle.getAttribute('aria-valuemax')).toBe('232')
            fireEvent.keyDown(handle, { key: 'End' })
            expect(handle.getAttribute('aria-valuenow')).toBe('232')

            rerender(resizeTableView(false, true, 180))
            expect(handle.getAttribute('aria-valuemax')).toBe('180')
            fireEvent.keyDown(handle, { key: 'End' })
            expect(handle.getAttribute('aria-valuenow')).toBe('180')
            expect(observers).toHaveLength(initial)
            unmount()
            expect(observers.every((observer) => observer.disconnected)).toBe(
                true,
            )
        } finally {
            cleanup()
            globalThis.ResizeObserver = originalObserver
            if (viewportWidth)
                Object.defineProperty(
                    HTMLElement.prototype,
                    'clientWidth',
                    viewportWidth,
                )
            else Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
        }
    })

    test('preserves controlled onEnd sizing, group leaves, inherited limits, RTL and touch cleanup', async () => {
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
            await act(async () => {
                await new Promise<void>((resolve) => {
                    window.requestAnimationFrame(() => resolve())
                })
            })
            expect(handle.style.transform).toBe('translateX(60px)')
            expect(handle.getAttribute('aria-valuenow')).toBe('160')
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

test('coalesces movement without layout reads and flushes or cancels queued work', () => {
    const viewportWidth = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'clientWidth',
    )
    const originalRequest = window.requestAnimationFrame
    const originalCancel = window.cancelAnimationFrame
    const frames = new Map<number, FrameRequestCallback>()
    let frameId = 0
    let widthReads = 0
    let sizingChanges = 0
    window.requestAnimationFrame = (callback) => {
        frames.set(++frameId, callback)
        return frameId
    }
    window.cancelAnimationFrame = (id) => {
        frames.delete(id)
    }
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get() {
            widthReads++
            return this.hasAttribute('data-rentner-table-container') ? 600 : 0
        },
    })
    function Controlled() {
        const [sizing, setSizing] = useState<Record<string, number>>({
            name: 150,
            role: 150,
            team: 80,
        })
        return (
            <DataTable
                data={[{ name: 'Kevin', role: 'Engineer', team: 'Core' }]}
                columns={columns}
                resizableColumns
                tableOptions={{
                    state: { columnSizing: sizing },
                    onColumnSizingChange: (updater) => {
                        sizingChanges++
                        setSizing(updater)
                    },
                }}
            />
        )
    }
    try {
        const { unmount } = render(<Controlled />)
        const handle = screen.getByRole('separator', { name: 'Resize Name' })
        fireEvent.mouseDown(handle, { button: 0, clientX: 100 })
        const initialChanges = sizingChanges
        widthReads = 0
        for (let index = 1; index <= 240; index++) {
            fireEvent.mouseMove(document, { clientX: 100 + index / 2 })
        }
        expect(sizingChanges).toBe(initialChanges)
        expect(frames.size).toBe(1)
        act(() => {
            const pending = [...frames.values()]
            frames.clear()
            for (const callback of pending) callback(0)
        })
        expect(sizingChanges).toBe(initialChanges + 1)
        expect(handle.getAttribute('aria-valuenow')).toBe('270')
        expect(widthReads).toBe(0)

        // Releasing before the next paint must commit the release position.
        fireEvent.mouseMove(document, { clientX: 230 })
        expect(frames.size).toBe(1)
        fireEvent.mouseUp(document, { clientX: 240 })
        expect(handle.getAttribute('aria-valuenow')).toBe('290')
        expect(sizingChanges).toBe(initialChanges + 2)
        expect(frames.size).toBe(0)

        fireEvent.mouseDown(handle, { button: 0, clientX: 100 })
        fireEvent.mouseMove(document, { clientX: 150 })
        expect(frames.size).toBe(1)
        fireEvent(window, new Event('blur'))
        expect(frames.size).toBe(0)
        expect(handle.hasAttribute('data-resizing')).toBe(false)
        expect(handle.getAttribute('aria-valuenow')).toBe('290')

        fireEvent.touchStart(handle, { touches: [{ clientX: 100 }] })
        fireEvent.touchMove(document, { touches: [{ clientX: 120 }] })
        expect(frames.size).toBe(1)
        fireEvent.touchCancel(document)
        expect(frames.size).toBe(0)
        expect(sizingChanges).toBe(initialChanges + 2)

        fireEvent.mouseDown(handle, { button: 0, clientX: 100 })
        fireEvent.mouseMove(document, { clientX: 150 })
        expect(frames.size).toBe(1)
        unmount()
        expect(frames.size).toBe(0)
        fireEvent.mouseUp(document, { clientX: 150 })
        expect(sizingChanges).toBe(initialChanges + 2)
    } finally {
        cleanup()
        window.requestAnimationFrame = originalRequest
        window.cancelAnimationFrame = originalCancel
        if (viewportWidth)
            Object.defineProperty(
                HTMLElement.prototype,
                'clientWidth',
                viewportWidth,
            )
        else Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
    }
})

import { afterEach, expect, mock, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import TableNativeReorderProvider from '../../../../shared/Table/Components/TableNativeReorderProvider.tsx'
import { useTableRowDragContext } from '../../../../shared/Table/Hooks/useTableRowDragContext.ts'
import { getTableMessages } from '../../../../lib/Messages/tableMessages.ts'

afterEach(cleanup)

function Rows() {
    const Group = useTableRowDragContext()
    if (!Group) return null
    return (
        <div>
            <table>
                {createElement(Group, {
                    id: 'a',
                    label: 'Alpha',
                    children: (handle) => (
                        <>
                            <tr>
                                <td>{handle}Alpha</td>
                            </tr>
                            <tr data-row-details-for="a">
                                <td>Details</td>
                            </tr>
                        </>
                    ),
                })}
                {createElement(Group, {
                    id: 'b',
                    label: 'Beta',
                    children: (handle) => (
                        <tr>
                            <td>{handle}Beta</td>
                        </tr>
                    ),
                })}
            </table>
        </div>
    )
}

function setup(disabled = false) {
    const onReorder = mock()
    const options = {
        rows: [{ id: 'a' }, { id: 'b' }],
        messages: getTableMessages('en'),
        disabled,
        getLabel: (id: string) => (id === 'a' ? 'Alpha' : 'Beta'),
        onReorder,
    }
    const result = render(
        <TableNativeReorderProvider {...options}>
            <Rows />
        </TableNativeReorderProvider>,
    )
    const table = result.container.querySelector('table')
    const viewport = table?.parentElement
    if (!table || !viewport) throw new Error('Table fixture missing')
    Object.defineProperty(viewport, 'clientWidth', { value: 320 })
    viewport.getBoundingClientRect = () => new DOMRect(10, 10, 320, 400)
    for (const [index, node] of [
        ...table.querySelectorAll('tbody'),
    ].entries()) {
        node.getBoundingClientRect = () =>
            new DOMRect(10, 20 + index * 80, 500, index ? 40 : 80)
    }
    return {
        ...result,
        options,
        onReorder,
        viewport,
        handle: screen.getByRole('button', { name: 'Move Alpha' }),
    }
}

test('native keyboard movement snapshots expanded groups, announces, cancels and restores focus', async () => {
    const { handle, onReorder } = setup()
    handle.focus()
    fireEvent.keyDown(handle, { key: ' ' })
    expect(handle.getAttribute('aria-pressed')).toBe('true')
    expect(
        document.querySelector(
            '[data-rentner-row-preview] [data-row-details-for="a"]',
        ),
    ).not.toBeNull()
    expect(
        document
            .querySelector('[data-rentner-row-preview]')
            ?.getAttribute('inert'),
    ).toBe('')
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(
        document.querySelector('[id^="DndLiveRegion"]')?.textContent,
    ).toContain('position 2 of 2')
    fireEvent.keyDown(handle, { key: 'Escape' })
    expect(onReorder).not.toHaveBeenCalled()
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    expect(document.activeElement).toBe(handle)
    fireEvent.keyDown(handle, { key: 'Enter' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(onReorder).toHaveBeenCalledWith('a', 'b')
})

test('native pending touch timer and active drag are cancelled by disabling and unmount', async () => {
    const { handle, rerender, options, onReorder, unmount } = setup()
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 7,
        pointerType: 'touch',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    rerender(
        <TableNativeReorderProvider {...options} disabled>
            <Rows />
        </TableNativeReorderProvider>,
    )
    await act(() => new Promise((resolve) => setTimeout(resolve, 190)))
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
    rerender(
        <TableNativeReorderProvider {...options}>
            <Rows />
        </TableNativeReorderProvider>,
    )
    fireEvent.keyDown(handle, { key: ' ' })
    expect(document.querySelector('[data-rentner-row-preview]')).not.toBeNull()
    unmount()
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
})

test('native mouse threshold ignores foreign pointers, reorders valid drops and cancels outside', async () => {
    const { handle, onReorder } = setup()
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 20, clientY: 35 })
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    fireEvent.pointerMove(document, { pointerId: 2, clientX: 20, clientY: 120 })
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 20, clientY: 120 })
    expect(document.querySelector('[data-rentner-row-preview]')).not.toBeNull()
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 20, clientY: 120 })
    expect(onReorder).toHaveBeenCalledWith('a', 'b')
    onReorder.mockClear()
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 3,
        pointerType: 'mouse',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    fireEvent.pointerMove(document, { pointerId: 3, clientX: 5, clientY: 120 })
    expect(document.querySelector('[data-rentner-row-preview]')).not.toBeNull()
    fireEvent.pointerUp(document, { pointerId: 3, clientX: 5, clientY: 120 })
    expect(onReorder).not.toHaveBeenCalled()
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
})

test('native touch hold activates, movement tolerance and touchcancel clean up', async () => {
    const { handle, onReorder } = setup()
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 20, clientY: 40 })
    await act(() => new Promise((resolve) => setTimeout(resolve, 190)))
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 2,
        pointerType: 'touch',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    await act(() => new Promise((resolve) => setTimeout(resolve, 190)))
    expect(document.querySelector('[data-rentner-row-preview]')).not.toBeNull()
    fireEvent.touchCancel(document)
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
})

test('native edge scrolling uses the scroll ancestor and stops on pointer cancellation', async () => {
    const { handle, viewport, onReorder } = setup()
    viewport.style.overflowY = 'auto'
    Object.defineProperty(viewport, 'clientHeight', { value: 400 })
    Object.defineProperty(viewport, 'scrollHeight', { value: 1000 })
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 20,
        clientY: 30,
    })
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 20, clientY: 405 })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(viewport.scrollTop).toBeGreaterThan(0)
    fireEvent.pointerCancel(document, { pointerId: 1 })
    const stopped = viewport.scrollTop
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(viewport.scrollTop).toBe(stopped)
    expect(onReorder).not.toHaveBeenCalled()
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
})

test('native Tab drops keyboard moves and resize cancels active sessions', () => {
    const { handle, onReorder } = setup()
    handle.focus()
    fireEvent.keyDown(handle, { key: ' ' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(fireEvent.keyDown(handle, { key: 'Tab' })).toBe(false)
    expect(onReorder).toHaveBeenCalledWith('a', 'b')
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    expect(handle.getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(handle)
    onReorder.mockClear()
    fireEvent.keyDown(handle, { key: ' ' })
    expect(fireEvent.keyDown(handle, { key: 'ArrowLeft' })).toBe(false)
    expect(fireEvent.keyDown(handle, { key: 'ArrowRight' })).toBe(false)
    fireEvent(window, new Event('resize'))
    expect(document.querySelector('[data-rentner-row-preview]')).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()
})

test('native translated callbacks preserve exact label and position argument contracts', async () => {
    const { handle, options, rerender } = setup()
    const dragStart = mock(() => 'started')
    const dragOver = mock(() => 'over')
    const dragEnd = mock(() => 'ended')
    const dragCancel = mock(() => 'cancelled')
    rerender(
        <TableNativeReorderProvider
            {...options}
            messages={{
                ...options.messages,
                dragStart,
                dragOver,
                dragEnd,
                dragCancel,
            }}
        >
            <Rows />
        </TableNativeReorderProvider>,
    )
    fireEvent.keyDown(handle, { key: ' ' })
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(dragStart.mock.calls).toEqual([['Alpha']])
    expect(dragOver.mock.calls).toEqual([['Alpha', 2, 2]])
    expect(dragEnd.mock.calls).toEqual([['Alpha', 2, 2]])
    fireEvent.keyDown(handle, { key: ' ' })
    fireEvent.keyDown(handle, { key: 'Escape' })
    expect(dragCancel.mock.calls).toEqual([['Alpha']])
})

function LayoutRows({
    ids,
    activeIndex,
}: {
    ids: readonly string[]
    activeIndex: number
}) {
    const Group = useTableRowDragContext()
    if (!Group) return null
    return (
        <div style={{ overflow: 'auto' }}>
            <table>
                {ids.map((id, index) =>
                    createElement(Group, {
                        key: id,
                        id,
                        label: id,
                        children: (handle) => (
                            <>
                                <tr>
                                    <td>
                                        {handle}
                                        {id}
                                    </td>
                                </tr>
                                {index === activeIndex && (
                                    <tr>
                                        <td>Expanded details</td>
                                    </tr>
                                )}
                            </>
                        ),
                    }),
                )}
            </table>
        </div>
    )
}

async function inspectCollisionFrame(count: number, from: number, to: number) {
    const ids = Array.from({ length: count }, (_, index) => `layout-${index}`)
    const result = render(
        <TableNativeReorderProvider
            rows={ids.map((id) => ({ id }))}
            disabled={false}
            messages={getTableMessages('en')}
            getLabel={(id) => id}
            onReorder={() => undefined}
        >
            <LayoutRows ids={ids} activeIndex={from} />
        </TableNativeReorderProvider>,
    )
    const groups = [...result.container.querySelectorAll('tbody')]
    const source = groups[from]
    const viewport = source?.closest('table')?.parentElement
    if (!source || !viewport) throw new Error('Layout fixture missing')
    Object.defineProperty(viewport, 'clientWidth', { value: 320 })
    Object.defineProperty(viewport, 'clientHeight', { value: 400 })
    Object.defineProperty(viewport, 'scrollHeight', { value: 800 })
    viewport.getBoundingClientRect = () => new DOMRect(10, 0, 320, 400)
    const rowHeight = 160 / count
    const sourceHeight = 20
    const topFor = (index: number) =>
        100 + index * rowHeight + (index > from ? sourceHeight - rowHeight : 0)
    for (const [index, node] of groups.entries())
        node.getBoundingClientRect = () =>
            new DOMRect(
                10,
                topFor(index) - viewport.scrollTop,
                320,
                index === from ? sourceHeight : rowHeight,
            )
    const sourceRect = mock(source.getBoundingClientRect)
    source.getBoundingClientRect = sourceRect
    const handle = screen.getByRole('button', { name: `Move ${ids[from]}` })
    fireEvent.pointerDown(handle, {
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        clientX: 20,
        clientY: topFor(from) + sourceHeight / 2,
    })
    fireEvent.pointerMove(document, {
        pointerId: 1,
        clientX: 20,
        clientY: topFor(to) + rowHeight / 2 - 16,
    })
    viewport.scrollTop = 16
    sourceRect.mockClear()
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    const sourceReads = sourceRect.mock.calls.length
    expect(sourceRect.mock.calls.length).toBe(1)
    for (const [index, node] of groups.entries()) {
        const shifted =
            from < to
                ? index > from && index <= to
                : index >= to && index < from
        const offset = from < to ? -sourceHeight : sourceHeight
        expect(node.style.transform).toBe(
            shifted ? `translate3d(0, ${offset}px, 0)` : '',
        )
    }
    fireEvent.keyDown(handle, { key: 'Escape' })
    result.unmount()
    return sourceReads
}

test('native collision frames share one source layout read across row counts and retain full-group sibling transforms', async () => {
    const small = await inspectCollisionFrame(4, 1, 2)
    const large = await inspectCollisionFrame(40, 1, 38)
    const upward = await inspectCollisionFrame(40, 38, 1)
    expect([small, large, upward]).toEqual([1, 1, 1])
})

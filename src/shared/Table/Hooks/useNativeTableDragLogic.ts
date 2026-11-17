import {
    createContext,
    useId,
    useLayoutEffect,
    useState,
    useCallback,
    useMemo,
} from 'react'
import { isTableEventElement } from '../../../lib/Table/events.ts'
import type {
    TableReorderProviderProps,
    TableRowPreview,
} from '../Types/interaction.types.ts'
import type {
    NativeTableDragContextValue,
    NativeTableDragController,
    NativeTableDragDisplay,
} from '../Types/nativeDrag.types.ts'

export const NativeTableDragContext =
    createContext<NativeTableDragContextValue | null>(null)

function snapshotRow(source: HTMLTableSectionElement): TableRowPreview | null {
    const table = source.closest('table')
    const viewport = table?.parentElement
    if (!table || !viewport) return null
    const bounds = source.getBoundingClientRect()
    const viewportBounds = viewport.getBoundingClientRect()
    const left = Math.max(
        bounds.left,
        viewportBounds.left + viewport.clientLeft,
    )
    const right = Math.min(
        bounds.right,
        viewportBounds.left + viewport.clientLeft + viewport.clientWidth,
    )
    const preview = table.ownerDocument.createElement('table')
    preview.className = table.className
    preview.dataset.size = table.dataset.size
    preview.dataset.striped = table.dataset.striped
    preview.style.width = `${bounds.width}px`
    preview.style.marginLeft = `${bounds.left - left}px`
    preview.style.tableLayout = 'fixed'
    preview.style.background = 'var(--rentner-surface, #181a1f)'
    const columns = table.ownerDocument.createElement('colgroup')
    for (const cell of source.firstElementChild?.children ?? []) {
        const column = table.ownerDocument.createElement('col')
        column.style.width = `${cell.getBoundingClientRect().width}px`
        columns.appendChild(column)
    }
    const clone = source.ownerDocument.importNode(source, true)
    clone.style.transform = ''
    clone.style.transition = ''
    clone.style.opacity = '1'
    clone.removeAttribute('data-dragging')
    for (const element of [clone, ...clone.querySelectorAll('[id], [name]')]) {
        element.removeAttribute('id')
        element.removeAttribute('name')
    }
    preview.append(columns, clone)
    return { element: preview, left, width: Math.max(0, right - left) }
}

function scrollAncestors(source: HTMLElement): Element[] {
    const parents: Element[] = []
    const view = source.ownerDocument.defaultView
    if (!view) return parents
    for (
        let node: HTMLElement | null = source;
        node;
        node = node.parentElement
    ) {
        if (!(node instanceof view.HTMLElement)) return parents
        const style = view.getComputedStyle(node)
        if (
            node !== source &&
            [style.overflow, style.overflowX, style.overflowY].some((value) =>
                /(auto|scroll|overlay)/.test(value),
            )
        )
            parents.push(node)
        if (style.position === 'fixed') return parents
        if (!node.parentElement && node.parentNode !== source.ownerDocument)
            return parents
    }
    const documentScroll = source.ownerDocument.scrollingElement
    if (documentScroll && !parents.includes(documentScroll))
        parents.push(documentScroll)
    return parents
}

function scrollBounds(doc: Document, element: Element) {
    const view = doc.defaultView
    if (element === doc.scrollingElement && view)
        return {
            top: 0,
            bottom: view.innerHeight,
            left: 0,
            right: view.innerWidth,
            height: view.innerHeight,
        }
    return element.getBoundingClientRect()
}

function createController(
    initial: TableReorderProviderProps,
    publish: (display: NativeTableDragDisplay) => void,
): NativeTableDragController {
    let options = initial
    const nodes = new Map<string, HTMLTableSectionElement>()
    let session: {
        id: string
        handle: HTMLButtonElement
        doc: Document
        source: HTMLTableSectionElement
        pointerId: number | null
        touch: boolean
        startX: number
        startY: number
        x: number
        y: number
        active: boolean
        over: string | null
        preview: TableRowPreview | null
        top: number
        height: number
        scrolls: Element[]
        forward: boolean
        backward: boolean
        timer: ReturnType<typeof setTimeout> | null
        frame: number | null
        lastFrame: number | null
        cleanup: () => void
    } | null = null
    let announcement = ''
    let restoreFrame: number | null = null
    let restoreView: Window | null = null
    const geometry = new Map<
        string,
        { top: number; bottom: number; height: number }
    >()
    const items = () => options.rows.map((row) => row.id)
    const announce = (
        kind: 'dragStart' | 'dragOver' | 'dragEnd' | 'dragCancel',
        id: string,
        over: string | null,
    ) => {
        const label = options.getLabel(id)
        const position = items().indexOf(over ?? id) + 1
        const translated =
            kind === 'dragStart' || kind === 'dragCancel'
                ? options.messages[kind]?.(label)
                : options.messages[kind]?.(label, position, options.rows.length)
        announcement =
            translated ??
            (kind === 'dragStart'
                ? `Moving ${label}.`
                : kind === 'dragOver'
                  ? `Position ${position} of ${options.rows.length}.`
                  : kind === 'dragEnd'
                    ? `Moved to position ${position}.`
                    : 'Move cancelled.')
    }
    const display = () => {
        const current = session
        publish({
            activeId: current?.active ? current.id : null,
            preview:
                current?.active && current.preview
                    ? {
                          ...current.preview,
                          top: current.top,
                          offset: current.y - current.startY,
                      }
                    : null,
            announcement,
        })
    }
    const resetRows = () => {
        for (const node of nodes.values()) {
            node.style.transform = ''
            node.style.transition = ''
            node.style.opacity = ''
            node.removeAttribute('data-dragging')
        }
        geometry.clear()
    }
    const finish = (commit: boolean, restore = true) => {
        const current = session
        if (!current) return
        session = null
        if (current.timer !== null) clearTimeout(current.timer)
        if (current.frame !== null)
            current.doc.defaultView?.cancelAnimationFrame(current.frame)
        current.cleanup()
        if (
            current.pointerId !== null &&
            current.handle.hasPointerCapture?.(current.pointerId)
        ) {
            try {
                current.handle.releasePointerCapture(current.pointerId)
            } catch {
                /* The browser may already have released capture. */
            }
        }
        resetRows()
        if (current.active) {
            const valid =
                commit &&
                !options.disabled &&
                current.over !== null &&
                items().includes(current.id) &&
                items().includes(current.over)
            announce(valid ? 'dragEnd' : 'dragCancel', current.id, current.over)
            display()
            if (valid && current.over !== current.id && current.over)
                options.onReorder?.(current.id, current.over)
            if (restore) {
                current.handle.focus({ preventScroll: true })
                restoreView = current.doc.defaultView
                restoreFrame =
                    restoreView?.requestAnimationFrame(() => {
                        restoreFrame = null
                        if (current.handle.isConnected)
                            current.handle.focus({ preventScroll: true })
                    }) ?? null
            }
        }
    }
    const onBlur = () => finish(false, false)
    const onResize = () => finish(false)
    const rectFor = (id: string, node: HTMLElement, offset?: number) => {
        const original = geometry.get(id)
        const current = session
        if (!original || !current) return node.getBoundingClientRect()
        const scrollOffset =
            offset ?? current.source.getBoundingClientRect().top - current.top
        return {
            top: original.top + scrollOffset,
            bottom: original.bottom + scrollOffset,
            height: original.height,
        }
    }
    const moveRows = () => {
        const current = session
        if (!current?.active) return
        const order = items()
        const from = order.indexOf(current.id)
        const to = order.indexOf(current.over ?? current.id)
        for (let index = 0; index < order.length; index++) {
            const id = order[index]
            const node = nodes.get(id)
            if (!node || id === current.id) continue
            const offset =
                from < to && index > from && index <= to
                    ? -current.height
                    : from > to && index >= to && index < from
                      ? current.height
                      : 0
            node.style.transition = 'transform 200ms ease'
            node.style.transform = offset
                ? `translate3d(0, ${offset}px, 0)`
                : ''
        }
    }
    const frame = (timestamp?: number) => {
        const current = session
        if (!current?.active) return
        current.frame = null
        const now = timestamp ?? current.doc.defaultView?.performance.now() ?? 0
        const elapsed =
            current.lastFrame === null
                ? 1
                : Math.min(64, Math.max(1, now - current.lastFrame)) / 5
        current.lastFrame = now
        const view = current.doc.defaultView
        if (!view || options.disabled || !current.source.isConnected) {
            finish(false)
            return
        }
        const clamp = current.scrolls[0]
        const ancestorBounds = clamp ? scrollBounds(current.doc, clamp) : null
        const top = ancestorBounds?.top ?? -Infinity
        const bottom = ancestorBounds?.bottom ?? Infinity
        const bounds = current.source.getBoundingClientRect()
        let offset = current.y - current.startY
        if (ancestorBounds) {
            if (current.top + offset <= top) offset = top - current.top
            else if (current.top + current.height + offset >= bottom)
                offset = bottom - current.top - current.height
        }
        const pointerY = current.y
        const viewport = current.source.closest('table')?.parentElement
        const viewportBounds = viewport?.getBoundingClientRect()
        let over: string | null = null
        if (current.pointerId === null) over = current.over
        else if (
            viewportBounds &&
            current.x >= viewportBounds.left &&
            current.x <= viewportBounds.right &&
            pointerY >= top &&
            pointerY <= bottom
        ) {
            for (const id of items()) {
                const node = nodes.get(id)
                if (!node) continue
                const rect = rectFor(id, node, bounds.top - current.top)
                if (pointerY >= rect.top && pointerY <= rect.bottom) {
                    over = id
                    break
                }
            }
        }
        if (current.over !== over) {
            current.over = over
            if (over) announce('dragOver', current.id, over)
        }
        moveRows()
        publish({
            activeId: current.id,
            preview: current.preview
                ? { ...current.preview, top: current.top, offset }
                : null,
            announcement,
        })
        if (
            current.pointerId !== null &&
            current.x >= (viewportBounds?.left ?? 0) &&
            current.x <= (viewportBounds?.right ?? view.innerWidth)
        ) {
            // Match the existing outer-first traversal, skipping ancestors that
            // cannot scroll in the user's direction at their current boundary.
            for (let index = current.scrolls.length - 1; index >= 0; index--) {
                const scroll = current.scrolls[index]
                const rect = scrollBounds(current.doc, scroll)
                const edge = rect.height * 0.2
                if (!edge) continue
                const before = scroll.scrollTop
                const viewportHeight =
                    scroll === current.doc.scrollingElement
                        ? view.innerHeight
                        : scroll.clientHeight
                const max = Math.max(0, scroll.scrollHeight - viewportHeight)
                const speed =
                    current.backward &&
                    before > 0 &&
                    pointerY <= rect.top + edge
                        ? -10 * Math.abs((rect.top + edge - pointerY) / edge)
                        : current.forward &&
                            before < max &&
                            pointerY >= rect.bottom - edge
                          ? 10 *
                            Math.abs((rect.bottom - edge - pointerY) / edge)
                          : 0
                if (!speed) continue
                const next = Math.max(
                    0,
                    Math.min(max, before + speed * elapsed),
                )
                scroll.scrollTop = next
                if (next !== before) {
                    current.frame = view.requestAnimationFrame(frame)
                    break
                }
            }
        }
        // Source geometry remains live during ancestor/window scrolling.
        if (bounds.height !== current.height) current.height = bounds.height
    }
    const schedule = () => {
        const current = session
        if (current?.active && current.frame === null)
            current.frame =
                current.doc.defaultView?.requestAnimationFrame(frame) ?? null
    }
    const activate = () => {
        const current = session
        if (!current || options.disabled || !items().includes(current.id)) {
            finish(false)
            return
        }
        current.timer = null
        current.preview = snapshotRow(current.source)
        if (!current.preview) {
            finish(false)
            return
        }
        current.active = true
        current.over = current.id
        const bounds = current.source.getBoundingClientRect()
        current.top = bounds.top
        current.height = bounds.height
        for (const [id, node] of nodes)
            geometry.set(id, node.getBoundingClientRect())
        current.source.style.opacity = '0'
        current.source.dataset.dragging = 'true'
        current.handle.focus({ preventScroll: true })
        announce('dragStart', current.id, current.id)
        display()
        schedule()
    }
    const begin = (
        id: string,
        handle: HTMLButtonElement,
        pointerId: number | null,
        x: number,
        y: number,
        touch: boolean,
    ) => {
        if (session || options.disabled || !items().includes(id)) return false
        if (restoreFrame !== null) {
            restoreView?.cancelAnimationFrame(restoreFrame)
            restoreFrame = null
        }
        const source = nodes.get(id)
        if (!source) return false
        const doc = source.ownerDocument
        const onMove = (event: PointerEvent) => {
            const current = session
            if (!current || event.pointerId !== current.pointerId) return
            if (event.clientY > current.y) current.forward = true
            if (event.clientY < current.y) current.backward = true
            current.x = event.clientX
            current.y = event.clientY
            const distance = Math.hypot(
                current.x - current.startX,
                current.y - current.startY,
            )
            if (!current.active) {
                if (current.touch && distance > 8) {
                    finish(false)
                    return
                }
                if (!current.touch && distance > 6) activate()
            }
            if (session?.active) {
                event.preventDefault()
                schedule()
            }
        }
        const onUp = (event: PointerEvent) => {
            if (event.pointerId !== session?.pointerId) return
            if (session?.active) {
                session.x = event.clientX
                session.y = event.clientY
                if (session.frame !== null)
                    session.doc.defaultView?.cancelAnimationFrame(session.frame)
                session.frame = null
                frame()
                event.preventDefault()
            }
            finish(true)
        }
        const onCancel = (event: PointerEvent) => {
            if (event.pointerId === session?.pointerId) finish(false)
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && session) {
                event.preventDefault()
                finish(false)
            } else if (
                event.key === 'Tab' &&
                session?.active &&
                session.pointerId === null
            ) {
                event.preventDefault()
                finish(true)
            }
        }
        const onClick = (event: MouseEvent) => {
            if (session?.active) {
                event.preventDefault()
                event.stopImmediatePropagation()
            }
        }
        const onTouchCancel = (event: TouchEvent) => {
            if (
                session?.touch &&
                (event.target === doc ||
                    event.target === handle ||
                    (isTableEventElement(event.target) &&
                        source.contains(event.target)))
            )
                finish(false)
        }
        const onLostCapture = (event: PointerEvent) => {
            if (event.pointerId === session?.pointerId) finish(false)
        }
        const onVisibility = () => {
            if (doc.hidden) finish(false, false)
        }
        doc.addEventListener('pointermove', onMove, { passive: false })
        doc.addEventListener('pointerup', onUp)
        doc.addEventListener('pointercancel', onCancel)
        doc.addEventListener('touchcancel', onTouchCancel)
        doc.addEventListener('keydown', onKey)
        doc.addEventListener('click', onClick, true)
        doc.addEventListener('scroll', schedule, true)
        doc.addEventListener('visibilitychange', onVisibility)
        doc.defaultView?.addEventListener('blur', onBlur)
        doc.defaultView?.addEventListener('resize', onResize)
        handle.addEventListener('lostpointercapture', onLostCapture)
        session = {
            id,
            source,
            handle,
            doc,
            pointerId,
            touch,
            startX: x,
            startY: y,
            x,
            y,
            active: false,
            over: null,
            preview: null,
            top: 0,
            height: 0,
            scrolls: scrollAncestors(source),
            forward: false,
            backward: false,
            timer: null,
            frame: null,
            lastFrame: null,
            cleanup: () => {
                doc.removeEventListener('pointermove', onMove)
                doc.removeEventListener('pointerup', onUp)
                doc.removeEventListener('pointercancel', onCancel)
                doc.removeEventListener('touchcancel', onTouchCancel)
                doc.removeEventListener('keydown', onKey)
                doc.removeEventListener('click', onClick, true)
                doc.removeEventListener('scroll', schedule, true)
                doc.removeEventListener('visibilitychange', onVisibility)
                doc.defaultView?.removeEventListener('blur', onBlur)
                doc.defaultView?.removeEventListener('resize', onResize)
                handle.removeEventListener('lostpointercapture', onLostCapture)
            },
        }
        return true
    }
    return {
        register: (id, element) => {
            if (element) nodes.set(id, element)
            else {
                nodes.delete(id)
                if (session?.id === id) finish(false, false)
            }
        },
        pointer: (id, event) => {
            if (
                event.defaultPrevented ||
                !event.isPrimary ||
                event.button !== 0 ||
                !isTableEventElement(event.target)
            )
                return
            if (
                !begin(
                    id,
                    event.currentTarget,
                    event.pointerId,
                    event.clientX,
                    event.clientY,
                    event.pointerType === 'touch',
                )
            )
                return
            try {
                event.currentTarget.setPointerCapture?.(event.pointerId)
            } catch {
                /* Synthetic pointers need document listeners instead. */
            }
            if (session?.touch) session.timer = setTimeout(activate, 180)
        },
        keyboard: (id, event) => {
            if (event.defaultPrevented || options.disabled) return
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault()
                if (event.repeat) return
                if (session?.id === id && session.pointerId === null)
                    finish(true)
                else if (begin(id, event.currentTarget, null, 0, 0, false))
                    activate()
            } else if (
                session?.id === id &&
                session.pointerId === null &&
                ['ArrowLeft', 'ArrowRight'].includes(event.key)
            ) {
                event.preventDefault()
            } else if (
                session?.id === id &&
                session.pointerId === null &&
                ['ArrowUp', 'ArrowDown'].includes(event.key)
            ) {
                event.preventDefault()
                const order = items()
                const index = order.indexOf(session.over ?? id)
                const next =
                    order[
                        Math.max(
                            0,
                            Math.min(
                                order.length - 1,
                                index + (event.key === 'ArrowDown' ? 1 : -1),
                            ),
                        )
                    ]
                const node = nodes.get(next)
                const activeNode = nodes.get(id)
                if (node && activeNode) {
                    session.over = next
                    session.y =
                        rectFor(next, node).top - rectFor(id, activeNode).top
                    announce('dragOver', id, next)
                    node.scrollIntoView?.({
                        block: 'nearest',
                        inline: 'nearest',
                    })
                    schedule()
                }
            }
        },
        update: (props) => {
            options = props
            if (
                session &&
                (props.disabled ||
                    !props.rows.some((row) => row.id === session?.id))
            )
                finish(false)
        },
        dispose: () => {
            finish(false, false)
            if (restoreFrame !== null)
                restoreView?.cancelAnimationFrame(restoreFrame)
        },
    }
}

export function useNativeTableDragLogic(props: TableReorderProviderProps) {
    const [display, setDisplay] = useState<NativeTableDragDisplay>({
        activeId: null,
        preview: null,
        announcement: '',
    })
    const instructionsId = useId()
    const [controller] = useState(() => createController(props, setDisplay))
    useLayoutEffect(() => controller.update(props), [controller, props])
    useLayoutEffect(() => () => controller.dispose(), [controller])
    const previewElement = display.preview?.element
    const previewRef = useCallback(
        (element: HTMLDivElement | null) => {
            if (element)
                element.replaceChildren(
                    ...(previewElement ? [previewElement] : []),
                )
        },
        [previewElement],
    )
    const context = useMemo(
        () => ({
            controller,
            activeId: display.activeId,
            options: props,
            instructionsId,
        }),
        [controller, display.activeId, props, instructionsId],
    )
    return {
        state: {
            context,
            display,
            instructionsId,
        },
        refs: { preview: previewRef },
    }
}

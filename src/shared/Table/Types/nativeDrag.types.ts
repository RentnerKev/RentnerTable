import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type {
    TableReorderProviderProps,
    TableRowPreview,
} from './interaction.types.ts'

export interface NativeTableDragDisplay {
    activeId: string | null
    preview: (TableRowPreview & { top: number; offset: number }) | null
    announcement: string
}

export interface NativeTableDragController {
    register: (id: string, element: HTMLTableSectionElement | null) => void
    setPreviewHost: (element: HTMLDivElement | null) => void
    pointer: (id: string, event: PointerEvent<HTMLButtonElement>) => void
    keyboard: (id: string, event: KeyboardEvent<HTMLButtonElement>) => void
    update: (props: TableReorderProviderProps) => void
    dispose: () => void
}

export interface NativeTableDragContextValue {
    controller: NativeTableDragController
    activeId: string | null
    options: TableReorderProviderProps
    instructionsId: string
}

export interface NativeTableDragRowLogicResult {
    state: {
        dragging: boolean
        style: CSSProperties
        disabled: boolean
        reason: string | undefined
        label: string
        instructionsId: string
    }
    refs: { row: (element: HTMLTableSectionElement | null) => void }
    handler: {
        handlePointerDown: (event: PointerEvent<HTMLButtonElement>) => void
        handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
    }
}

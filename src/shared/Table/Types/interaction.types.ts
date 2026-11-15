import type { Cell, Header, RowData } from '@tanstack/react-table'
import type { MouseEvent, ReactNode, Ref } from 'react'
import type { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import type { TableRow, TableBodyProps } from './dataTable.types.ts'
import type { RentnerTableInstance, TableMessages } from './table.types.ts'

export type TableCell<TData extends RowData> = Cell<
    typeof rentnerTableFeatures,
    TData,
    unknown
>

export interface TableRowEvents<TData extends RowData> {
    /** Ignores controls, prevented events and descendants marked data-no-row-click. */
    onRowClick?: (
        row: TableRow<TData>,
        event: MouseEvent<HTMLTableRowElement>,
    ) => void
    onRowDoubleClick?: (
        row: TableRow<TData>,
        event: MouseEvent<HTMLTableRowElement>,
    ) => void
    onRowContextMenu?: (
        row: TableRow<TData>,
        event: MouseEvent<HTMLTableRowElement>,
    ) => void
    onCellClick?: (
        cell: TableCell<TData>,
        event: MouseEvent<HTMLTableCellElement>,
    ) => void
    onCellDoubleClick?: (
        cell: TableCell<TData>,
        event: MouseEvent<HTMLTableCellElement>,
    ) => void
    onCellContextMenu?: (
        cell: TableCell<TData>,
        event: MouseEvent<HTMLTableCellElement>,
    ) => void
}

export interface TableRowOrderChange {
    activeId: string
    overId: string
    /** Positions within the full data input, before filtering and pagination. */
    fromIndex: number
    toIndex: number
}

export interface TableInteractionMessages {
    resizeColumn: (label: string) => string
    resetColumnSize: (label: string) => string
    moveRows: string
    moveRow: (label: string) => string
    rowSortingActive: string
    dragInstructions: string
    dragStart: (label: string) => string
    dragOver: (label: string, position: number, total: number) => string
    dragEnd: (label: string, position: number, total: number) => string
    dragCancel: (label: string) => string
}

export type TableDataRowProps<TData extends RowData> = Omit<
    TableBodyProps<TData>,
    'view'
> & {
    row: TableRow<TData>
    view: TableBodyProps<TData>['view']
    index: number
    dragHandle?: ReactNode
}
export interface ColumnResizeLogicResult {
    state: {
        fixed: boolean
        width: number
        widths: { id: string; width: number }[]
    }
    refs: { table: Ref<HTMLTableElement> }
}
export interface TableColumnResizeHandleProps<TData extends RowData> {
    table: RentnerTableInstance<TData>
    header: Header<typeof rentnerTableFeatures, TData, unknown>
    messages: TableMessages
    disabled?: boolean
}

export interface TableReorderProviderProps {
    rows: readonly { id: string }[]
    messages: TableMessages
    disabled: boolean
    disabledReason?: string
    getLabel: (id: string) => string
    onReorder?: (activeId: string, overId: string) => void
    children: ReactNode
}

export interface TableDragOptions {
    disabled: boolean
    reason?: string
    moveRow: (label: string) => string
}

export interface TableRowPreview {
    element: HTMLTableElement
    left: number
    width: number
}

export interface TableDragGroupProps {
    id: string
    label: string
    children: (handle: ReactNode) => ReactNode
}

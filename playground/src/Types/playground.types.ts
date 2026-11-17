import type {
    DataTableContext,
    TableColumn,
    TableLocale,
    TableRow,
    TableRowEvents,
    TableSize,
} from '../../../src/index.ts'
import type { MouseEventHandler, ReactNode } from 'react'
import type { MenuItem } from '@rentnerkev/menu'

export interface Member {
    id: string
    name: string
    email: string
    role: string
    projects: number
    active: boolean
    createdAt: string
}

export interface TeamTableProps {
    data: readonly Member[]
    locale: TableLocale
    size: TableSize
    isLoading: boolean
    striped: boolean
    resizableColumns: boolean
    columnSettings: boolean
    reorderableRows: boolean
    rememberSettings: boolean
    error: boolean
    onRetry: () => void
    onAddMember: () => void
    onActivateMembers: (context: DataTableContext<Member>) => void
    onStatusChange: (id: string, active: boolean) => void
}

export interface TeamTableLogicResult {
    state: {
        columns: readonly TableColumn<Member>[]
        caption: string
        renderExpandedRow: (row: TableRow<Member>) => ReactNode
        bulkActions: (context: DataTableContext<Member>) => ReactNode
        contextItems: MenuItem[]
        portalContainer: HTMLDivElement | null
        lastRowEvent: string
    }
    refs: { target: (element: HTMLDivElement | null) => void }
    handler: {
        handleRowClick: NonNullable<TableRowEvents<Member>['onRowClick']>
        handleRowDoubleClick: NonNullable<
            TableRowEvents<Member>['onRowDoubleClick']
        >
        handleRowContextMenu: NonNullable<
            TableRowEvents<Member>['onRowContextMenu']
        >
        handleTableContextMenu: MouseEventHandler<HTMLTableElement>
    }
}

export interface PlaygroundLogicResult {
    state: {
        data: readonly Member[]
        locale: TableLocale
        size: TableSize
        isEmpty: boolean
        isLoading: boolean
        isLight: boolean
        striped: boolean
        resizableColumns: boolean
        columnSettings: boolean
        reorderableRows: boolean
        rememberSettings: boolean
        error: boolean
    }
    handler: {
        handleToggleEmpty: () => void
        handleToggleLoading: () => void
        handleToggleTheme: () => void
        handleToggleStriped: () => void
        handleToggleResize: () => void
        handleToggleColumnSettings: () => void
        handleToggleReorder: () => void
        handleToggleRemember: () => void
        handleToggleLocale: () => void
        handleSizeChange: (size: TableSize) => void
        handleToggleError: () => void
        handleRetry: () => void
        handleAddMember: () => void
        handleActivateMembers: (context: DataTableContext<Member>) => void
        handleStatusChange: TeamTableProps['onStatusChange']
    }
}

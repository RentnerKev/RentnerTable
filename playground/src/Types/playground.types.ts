import type {
    DataTableContext,
    TableColumn,
    TableLocale,
    TableRow,
    TableSize,
} from '../../../src/index.ts'
import type { ReactNode } from 'react'

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
    error: boolean
    onRetry: () => void
    onAddMember: () => void
    onActivateMembers: (context: DataTableContext<Member>) => void
}

export interface TeamTableLogicResult {
    state: {
        columns: readonly TableColumn<Member>[]
        caption: string
        renderExpandedRow: (row: TableRow<Member>) => ReactNode
        bulkActions: (context: DataTableContext<Member>) => ReactNode
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
        error: boolean
    }
    handler: {
        handleToggleEmpty: () => void
        handleToggleLoading: () => void
        handleToggleTheme: () => void
        handleToggleStriped: () => void
        handleToggleLocale: () => void
        handleSizeChange: (size: TableSize) => void
        handleToggleError: () => void
        handleRetry: () => void
        handleAddMember: () => void
        handleActivateMembers: (context: DataTableContext<Member>) => void
    }
}

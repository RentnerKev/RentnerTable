import { createContext, useContext } from 'react'
import type { ComponentType } from 'react'
import type { TableDragGroupProps } from '../Types/interaction.types.ts'

export const TableRowDragContext =
    createContext<ComponentType<TableDragGroupProps> | null>(null)

export function useTableRowDragContext() {
    return useContext(TableRowDragContext)
}

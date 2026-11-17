import type { ReactNode } from 'react'

export type TableColumnFilter =
    | { type: 'text'; placeholder?: string; maxLength?: number }
    | {
          type: 'select'
          placeholder?: string
          options: readonly { value: string; label: string }[]
      }
    | { type: 'dateRange'; placeholder?: string }
    | {
          type: 'custom'
          render: (props: {
              value: unknown
              onValueChange: (value: unknown) => void
              label: string
          }) => ReactNode
      }

export interface TableColumnMeta {
    /** Classes for this column's filter field, including responsive layout. */
    filterClassName?: string
    label?: string
    align?: 'left' | 'center' | 'right'
    headerClassName?: string
    cellClassName?: string
    filter?: TableColumnFilter
}

export interface TableDateRange {
    from?: string
    to?: string
}

import type { RangeCalendarProps } from '@rentnerkev/calendar'
import type { ReactNode } from 'react'

export type TableDateRangeOptions = Pick<
    RangeCalendarProps,
    'locale' | 'weekStartsOn' | 'showHolidays' | 'fastEdit' | 'backdrop'
>

export type TableColumnFilter =
    | { type: 'text'; placeholder?: string; maxLength?: number }
    | {
          type: 'select'
          placeholder?: string
          options?: readonly { value: string; label: string }[]
          match?: 'equals' | 'includes'
      }
    | {
          type: 'dateRange'
          placeholder?: string
          calendarOptions?: TableDateRangeOptions
      }
    | {
          type: 'custom'
          render: (props: {
              value: unknown
              onValueChange: (value: unknown) => void
              label: string
          }) => ReactNode
      }

export interface TableColumnMeta {
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

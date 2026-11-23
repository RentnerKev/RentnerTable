import type { RowData } from '@tanstack/react-table'
import type {
    RentnerTableInstance,
    TableLocale,
    TableMessages,
} from '../../shared/Table/Types/table.types.ts'
import { getTableDateRange } from './filters.ts'
import { getColumnLabel } from './presentation.ts'

function scalarLabel(value: unknown): string {
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value)
    if (typeof value === 'boolean' || typeof value === 'bigint')
        return String(value)
    return ''
}

const utcDateFormatters = /* @__PURE__ */ new Map<string, Intl.DateTimeFormat>()

function getUtcDateFormatter(locale: TableLocale): Intl.DateTimeFormat {
    let formatter = utcDateFormatters.get(locale)
    if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, { timeZone: 'UTC' })
        utcDateFormatters.set(locale, formatter)
    }
    return formatter
}

function dateLabel(value: string | undefined, locale: TableLocale): string {
    if (
        !value ||
        value.length !== 10 ||
        value.charCodeAt(4) !== 45 ||
        value.charCodeAt(7) !== 45
    )
        return ''
    const date = new Date(`${value}T00:00:00.000Z`)
    if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    )
        return ''
    return getUtcDateFormatter(locale).format(date)
}

export function getTableFilterSummary<TData extends RowData>(
    table: RentnerTableInstance<TData>,
    globalFilter: unknown,
    locale: TableLocale,
    messages: TableMessages,
): string {
    const search = scalarLabel(globalFilter)
    const filters = table.state.columnFilters
    if (!search && filters.length === 0) return ''
    const summary: string[] = []
    if (search) summary.push(`${messages.search}: ${search}`)
    for (const filter of filters) {
        const column = table.getColumn(filter.id)
        if (!column) continue
        const config = column.columnDef.meta?.filter
        let value = scalarLabel(filter.value)
        if (config?.type === 'select') {
            if (config.options)
                value =
                    config.options.find(
                        (option) => option.value === filter.value,
                    )?.label ?? value
            else if (typeof filter.value === 'string') value = filter.value
        }
        if (config?.type === 'dateRange') {
            const range = getTableDateRange(filter.value)
            const from = dateLabel(range.from, locale)
            const to = dateLabel(range.to, locale)
            value =
                from && to
                    ? `${from} – ${to}`
                    : from
                      ? `≥ ${from}`
                      : to
                        ? `≤ ${to}`
                        : ''
        }
        const label = getColumnLabel(column)
        summary.push(value ? `${label}: ${value}` : label)
    }
    return summary.join('; ')
}

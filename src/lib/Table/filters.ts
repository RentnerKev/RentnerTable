import type { TableDateRange } from '../../shared/Table/Types/column.types.ts'

const resolvedText = Symbol('tableTextFilter')
const resolvedDateRange = Symbol('tableDateRangeFilter')

function searchableValue(value: unknown): string {
    if (value instanceof Date)
        return Number.isFinite(value.getTime()) ? value.toISOString() : ''
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    )
        return String(value)
    return ''
}

function resolveTextFilterValue(value: unknown) {
    return {
        [resolvedText]: searchableValue(value).trim().toLocaleLowerCase(),
    }
}

function getTextQuery(value: unknown): string {
    return typeof value === 'object' &&
        value !== null &&
        resolvedText in value &&
        typeof value[resolvedText] === 'string'
        ? value[resolvedText]
        : resolveTextFilterValue(value)[resolvedText]
}

export const tableTextFilter = /* @__PURE__ */ Object.assign(
    (
        row: { getValue: (id: string) => unknown },
        columnId: string,
        value: unknown,
    ) => {
        return searchableValue(row.getValue(columnId))
            .toLocaleLowerCase()
            .includes(getTextQuery(value))
    },
    {
        autoRemove: (value: unknown) => searchableValue(value).trim() === '',
        resolveFilterValue: (value: unknown): unknown =>
            resolveTextFilterValue(value),
    },
)

export function createTableSearchFilter<TData>(
    getSearchValues: (
        row: TData,
    ) => readonly (string | number | boolean | bigint | Date | null | undefined)[],
) {
    return Object.assign(
        (row: { original: TData }, _columnId: string, value: unknown) => {
            const query = getTextQuery(value)
            return (
                query === '' ||
                getSearchValues(row.original).some((item) =>
                    searchableValue(item).toLocaleLowerCase().includes(query),
                )
            )
        },
        { resolveFilterValue: tableTextFilter.resolveFilterValue },
    )
}

export const tableEqualsFilter = /* @__PURE__ */ Object.assign(
    (
        row: { getValue: (id: string) => unknown },
        columnId: string,
        value: unknown,
    ) => searchableValue(row.getValue(columnId)) === searchableValue(value),
    { autoRemove: (value: unknown) => value == null || value === '' },
)

export const tableIncludesFilter = /* @__PURE__ */ Object.assign(
    (
        row: { getValue: (id: string) => unknown },
        columnId: string,
        value: unknown,
    ) => {
        const values = row.getValue(columnId)
        return (
            typeof value === 'string' &&
            Array.isArray(values) &&
            values.includes(value)
        )
    },
    { autoRemove: tableEqualsFilter.autoRemove },
)

export function getTableDateRange(value: unknown): TableDateRange {
    if (typeof value !== 'object' || value === null) return {}
    return {
        from:
            'from' in value && typeof value.from === 'string'
                ? value.from
                : undefined,
        to:
            'to' in value && typeof value.to === 'string'
                ? value.to
                : undefined,
    }
}

function dateBoundary(value: string, end: boolean): number {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!parts) return Number.NaN
    const year = Number(parts[1])
    const month = Number(parts[2]) - 1
    const day = Number(parts[3])
    const date = new Date(0)
    date.setFullYear(year, month, day)
    date.setHours(0, 0, 0, 0)
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    )
        return Number.NaN
    if (end) date.setHours(23, 59, 59, 999)
    return date.getTime()
}

function resolveDateRangeFilterValue(value: unknown) {
    const range = getTableDateRange(value)
    return {
        [resolvedDateRange]: true,
        from: range.from ? dateBoundary(range.from, false) : -Infinity,
        to: range.to ? dateBoundary(range.to, true) : Infinity,
    }
}

function isResolvedDateRange(
    value: unknown,
): value is ReturnType<typeof resolveDateRangeFilterValue> {
    return (
        typeof value === 'object' &&
        value !== null &&
        resolvedDateRange in value &&
        'from' in value &&
        'to' in value &&
        typeof value.from === 'number' &&
        typeof value.to === 'number'
    )
}

export const tableDateRangeFilter = /* @__PURE__ */ Object.assign(
    (
        row: { getValue: (id: string) => unknown },
        columnId: string,
        value: unknown,
    ) => {
        const range = isResolvedDateRange(value)
            ? value
            : resolveDateRangeFilterValue(value)
        const raw = row.getValue(columnId)
        const timestamp =
            raw instanceof Date
                ? raw.getTime()
                : typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
                  ? dateBoundary(raw, false)
                  : typeof raw === 'string' || typeof raw === 'number'
                    ? new Date(raw).getTime()
                    : Number.NaN
        if (!Number.isFinite(timestamp)) return false
        return timestamp >= range.from && timestamp <= range.to
    },
    {
        resolveFilterValue: (value: unknown): unknown =>
            resolveDateRangeFilterValue(value),
        autoRemove: (value: unknown) => {
            const range = getTableDateRange(value)
            return !range.from && !range.to
        },
    },
)

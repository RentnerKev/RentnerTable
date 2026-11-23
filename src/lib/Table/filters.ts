import type { TableDateRange } from '../../shared/Table/Types/column.types.ts'

const resolvedText = Symbol('tableTextFilter')
const resolvedEquals = Symbol('tableEqualsFilter')
const resolvedDateRange = Symbol('tableDateRangeFilter')

function searchableValue(value: unknown): string {
    if (typeof value === 'string') return value
    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    )
        return String(value)
    if (value instanceof Date)
        return Number.isFinite(value.getTime()) ? value.toISOString() : ''
    return ''
}

function toLowerFast(value: string): string {
    for (let i = 0; i < value.length; i += 1) {
        if (value.charCodeAt(i) >= 128) return value.toLocaleLowerCase()
    }
    return value.toLowerCase()
}

function resolveTextFilterValue(value: unknown) {
    return {
        [resolvedText]: toLowerFast(searchableValue(value).trim()),
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
        const query = getTextQuery(value)
        if (!query) return true
        return toLowerFast(searchableValue(row.getValue(columnId))).includes(
            query,
        )
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
    ) => readonly (
        string | number | boolean | bigint | Date | null | undefined
    )[],
) {
    return Object.assign(
        (row: { original: TData }, _columnId: string, value: unknown) => {
            const query = getTextQuery(value)
            if (!query) return true
            const values = getSearchValues(row.original)
            for (let i = 0; i < values.length; i += 1) {
                if (toLowerFast(searchableValue(values[i])).includes(query))
                    return true
            }
            return false
        },
        { resolveFilterValue: tableTextFilter.resolveFilterValue },
    )
}

function resolveEqualsFilterValue(value: unknown) {
    return { [resolvedEquals]: searchableValue(value) }
}

function getEqualsQuery(value: unknown): string {
    return typeof value === 'object' &&
        value !== null &&
        resolvedEquals in value &&
        typeof value[resolvedEquals] === 'string'
        ? value[resolvedEquals]
        : searchableValue(value)
}

export const tableEqualsFilter = /* @__PURE__ */ Object.assign(
    (
        row: { getValue: (id: string) => unknown },
        columnId: string,
        value: unknown,
    ) => searchableValue(row.getValue(columnId)) === getEqualsQuery(value),
    {
        autoRemove: (value: unknown) => value == null || value === '',
        resolveFilterValue: (value: unknown): unknown =>
            resolveEqualsFilterValue(value),
    },
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
    if (
        value.length !== 10 ||
        value.charCodeAt(4) !== 45 ||
        value.charCodeAt(7) !== 45
    )
        return Number.NaN
    const y0 = value.charCodeAt(0) - 48
    const y1 = value.charCodeAt(1) - 48
    const y2 = value.charCodeAt(2) - 48
    const y3 = value.charCodeAt(3) - 48
    const m0 = value.charCodeAt(5) - 48
    const m1 = value.charCodeAt(6) - 48
    const d0 = value.charCodeAt(8) - 48
    const d1 = value.charCodeAt(9) - 48
    if (
        y0 < 0 ||
        y0 > 9 ||
        y1 < 0 ||
        y1 > 9 ||
        y2 < 0 ||
        y2 > 9 ||
        y3 < 0 ||
        y3 > 9 ||
        m0 < 0 ||
        m0 > 9 ||
        m1 < 0 ||
        m1 > 9 ||
        d0 < 0 ||
        d0 > 9 ||
        d1 < 0 ||
        d1 > 9
    )
        return Number.NaN
    const year = y0 * 1000 + y1 * 100 + y2 * 10 + y3
    const month = m0 * 10 + m1 - 1
    const day = d0 * 10 + d1
    let date: Date
    if (year >= 100) {
        date = end
            ? new Date(year, month, day, 23, 59, 59, 999)
            : new Date(year, month, day)
    } else {
        date = new Date(0)
        date.setFullYear(year, month, day)
        date.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0)
    }
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day
    )
        return Number.NaN
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
        let timestamp: number
        if (raw instanceof Date) {
            timestamp = raw.getTime()
        } else if (typeof raw === 'string') {
            if (
                raw.length === 10 &&
                raw.charCodeAt(4) === 45 &&
                raw.charCodeAt(7) === 45
            ) {
                timestamp = dateBoundary(raw, false)
            } else {
                timestamp = Date.parse(raw)
            }
        } else if (typeof raw === 'number') {
            timestamp = Math.abs(raw) <= 8.64e15 ? Math.trunc(raw) : Number.NaN
        } else {
            timestamp = Number.NaN
        }
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

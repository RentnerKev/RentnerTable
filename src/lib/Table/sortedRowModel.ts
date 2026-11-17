import {
    createSortedRowModel,
    skipFirstRun,
    sortFns,
    tableMemo,
} from '@tanstack/react-table'
import {
    column_getCanSort,
    column_getSortFn,
} from '@tanstack/react-table/static-functions'
import type {
    Atoms_All,
    ColumnDef_RowSorting,
    RowData,
    RowModel,
    Table,
    TableFeatures,
} from '@tanstack/react-table'

type Chunk = string | number

interface PreparedSort {
    keys: unknown[]
    missing: Uint8Array
    compare: (left: unknown, right: unknown) => number
    desc: boolean
    isInverted: boolean
    undefinedPriority: false | -1 | 1 | 'first' | 'last' | undefined
}

const builtins = /* @__PURE__ */ Object.entries(sortFns).map(([name, fn]) => ({
    fn,
    resolve: fn.resolveDataValue,
    compare: fn.sort,
    natural: name === 'alphanumeric' || name === 'alphanumericCaseSensitive',
    basic: name === 'basic',
    datetime: name === 'datetime',
}))

function chunks(text: string): Chunk[] {
    const result: Chunk[] = []
    let start = 0
    while (start < text.length) {
        const code = text.charCodeAt(start)
        const numeric = code >= 48 && code <= 57
        let end = start + 1
        while (end < text.length) {
            const next = text.charCodeAt(end)
            if ((next >= 48 && next <= 57) !== numeric) break
            end++
        }
        const part = text.slice(start, end)
        result.push(numeric ? Number.parseInt(part, 10) : part)
        start = end
    }
    return result
}

function compareChunks(left: Chunk[], right: Chunk[]) {
    const length = Math.min(left.length, right.length)
    for (let index = 0; index < length; index++) {
        const a = left[index]
        const b = right[index]
        if (typeof a === 'number') {
            if (typeof b !== 'number') return 1
            if (a > b) return 1
            if (a < b) return -1
        } else {
            if (typeof b === 'number') return -1
            if (a > b) return 1
            if (a < b) return -1
        }
    }
    return left.length - right.length
}

function isStandardDate(value: unknown): boolean {
    try {
        return (
            value instanceof Date &&
            Object.getPrototypeOf(value) === Date.prototype &&
            !Object.hasOwn(value, 'getTime') &&
            Number.isFinite(Date.prototype.getTime.call(value))
        )
    } catch {
        // Fake Dates and proxies can reject intrinsic calls or descriptor checks.
        return false
    }
}
function materialize<TFeatures extends TableFeatures, TData extends RowData>(
    table: Table<TFeatures, TData>,
    model: RowModel<TFeatures, TData>,
): RowModel<TFeatures, TData> | undefined {
    const sorting = (table.atoms as Atoms_All).sorting?.get()
    const rows = model.rows
    if (!rows.length || !sorting?.length) return model
    if (
        rows.length < 2 ||
        rows.some(
            (row) =>
                row.subRows.length > 0 ||
                row.depth !== 0 ||
                row.parentId !== undefined ||
                Object.hasOwn(row, 'getValue'),
        )
    )
        return
    const resolved: {
        id: string
        key: string
        builtin: (typeof builtins)[number]
        desc: boolean
        isInverted: boolean
        undefinedPriority: PreparedSort['undefinedPriority']
    }[] = []
    // Resolve every sort before reading keys: a later custom sort must fall back
    // without evaluating earlier, otherwise-unused accessor values.
    for (const entry of sorting) {
        const column = table.getColumn(entry.id)
        if (!column || !column_getCanSort(column)) continue
        const fn: unknown = column_getSortFn(column)
        const definition = column.columnDef as ColumnDef_RowSorting<
            TFeatures,
            TData
        > & {
            accessorFn?: unknown
            accessorKey?: unknown
        }
        const builtin = builtins.find((candidate) => candidate.fn === fn)
        const key = definition.accessorKey
        // Function identity is the allowlist; arbitrary .sort metadata is not.
        if (
            !builtin ||
            builtin.fn.sort !== builtin.compare ||
            builtin.fn.resolveDataValue !== builtin.resolve ||
            definition.accessorFn ||
            typeof key !== 'string' ||
            key.includes('.')
        )
            return
        const undefinedPriority = definition.sortUndefined
        const isInverted = definition.invertSorting
        if (
            typeof entry.desc !== 'boolean' ||
            (isInverted !== undefined && typeof isInverted !== 'boolean') ||
            (undefinedPriority !== undefined &&
                undefinedPriority !== false &&
                undefinedPriority !== -1 &&
                undefinedPriority !== 1 &&
                undefinedPriority !== 'first' &&
                undefinedPriority !== 'last')
        )
            return
        resolved.push({
            id: entry.id,
            key,
            builtin,
            desc: entry.desc,
            isInverted: isInverted ?? false,
            undefinedPriority,
        })
    }
    if (!resolved.length) return model
    // Eager key preparation is safe only for own data properties. Native sorting
    // can leave secondary keys unread, so getters/deep/prototype lookups delegate.
    try {
        for (const row of rows) {
            const original = row.original
            if (typeof original !== 'object' || original === null) return
            for (const sort of resolved) {
                const descriptor = Object.getOwnPropertyDescriptor(
                    original,
                    sort.key,
                )
                if (!descriptor || !Object.hasOwn(descriptor, 'value')) return
            }
        }
    } catch {
        // Descriptor inspection can throw on a proxy even when ordinary reads work.
        return
    }
    const prepared: PreparedSort[] = []
    for (const sort of resolved) {
        const keys: unknown[] = []
        const missing = new Uint8Array(rows.length)
        const values = new Map<string | number, unknown>()
        for (let index = 0; index < rows.length; index++) {
            const raw = rows[index].getValue(sort.id)
            if (raw === undefined) missing[index] = 1
            // Avoid changing coercion/getter behavior for unsupported numeric data.
            if (
                sort.builtin.basic &&
                raw !== undefined &&
                (typeof raw !== 'number' || Number.isNaN(raw))
            )
                return
            if (
                sort.builtin.datetime &&
                raw !== undefined &&
                !(typeof raw === 'number' && Number.isFinite(raw)) &&
                !isStandardDate(raw)
            )
                return
            if (
                sort.builtin.natural &&
                (typeof raw === 'string' || typeof raw === 'number') &&
                values.has(raw)
            ) {
                keys[index] = values.get(raw)
                continue
            }
            const normalized: unknown = sort.builtin.resolve
                ? sort.builtin.resolve(raw)
                : raw
            const key =
                sort.builtin.natural && typeof normalized === 'string'
                    ? chunks(normalized)
                    : normalized
            keys[index] = key
            if (
                sort.builtin.natural &&
                (typeof raw === 'string' || typeof raw === 'number')
            ) {
                if (values.size >= 4096) values.clear()
                values.set(raw, key)
            }
        }
        // Built-in value comparators ignore row context; identity was checked above.
        const compare = sort.builtin.natural
            ? (compareChunks as (left: unknown, right: unknown) => number)
            : (sort.builtin.compare as (
                  left: unknown,
                  right: unknown,
              ) => number)
        prepared.push({
            keys,
            missing,
            compare,
            desc: sort.desc,
            isInverted: sort.isInverted,
            undefinedPriority: sort.undefinedPriority,
        })
    }
    const indices = Array.from({ length: rows.length }, (_, index) => index)
    indices.sort((left, right) => {
        for (const sort of prepared) {
            let comparison = 0
            const priority = sort.undefinedPriority
            if (priority) {
                const aMissing = sort.missing[left] === 1
                const bMissing = sort.missing[right] === 1
                if (aMissing && bMissing) continue
                if (aMissing || bMissing) {
                    if (priority === 'first') return aMissing ? -1 : 1
                    if (priority === 'last') return aMissing ? 1 : -1
                    comparison = aMissing ? priority : -priority
                }
            }
            if (comparison === 0)
                comparison = sort.compare(sort.keys[left], sort.keys[right])
            if (comparison !== 0) {
                if (sort.desc) comparison *= -1
                if (sort.isInverted) comparison *= -1
                return comparison
            }
        }
        return rows[left].index - rows[right].index
    })
    const sorted = indices.map((index) => rows[index])
    return { rows: sorted, flatRows: [...sorted], rowsById: model.rowsById }
}
/** Materialize only known, flat built-in sorts; retain TanStack for other tables. */
export function createMaterializedSortedRowModel<
    TFeatures extends TableFeatures,
    TData extends RowData,
>() {
    return (table: Table<TFeatures, TData>) => {
        const fallback = createSortedRowModel<TFeatures, TData>()(table)
        const sortingAtom = (table.atoms as Atoms_All).sorting
        let fallbackInitialized = false
        let previousFallbackSorting: unknown
        let previousFallbackModel: unknown
        const resetQueue: boolean[] = []
        let resetCurrent = false
        const reset = skipFirstRun(() => {
            if (
                resetCurrent &&
                'autoResetPageIndex' in table &&
                typeof table.autoResetPageIndex === 'function'
            )
                table.autoResetPageIndex()
        })
        return tableMemo({
            feature: 'rowSortingFeature',
            table,
            fnName: 'table.getSortedRowModel',
            memoDeps: () => [sortingAtom?.get(), table.getPreSortedRowModel()],
            fn: (sorting, model) => {
                const fast = materialize(table, model)
                if (fast) {
                    resetQueue.push(true)
                    return fast
                }
                const recomputes =
                    !fallbackInitialized ||
                    sorting !== previousFallbackSorting ||
                    model !== previousFallbackModel
                const ownsReset = !fallbackInitialized || !recomputes
                const result = fallback()
                fallbackInitialized = true
                previousFallbackSorting = sorting
                previousFallbackModel = model
                resetQueue.push(ownsReset)
                return result
            },
            onAfterUpdate: () => {
                // tableMemo defers callbacks: retain ownership for each computation.
                resetCurrent = resetQueue.shift() ?? false
                reset()
            },
        })
    }
}

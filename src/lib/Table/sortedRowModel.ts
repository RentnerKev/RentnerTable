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
type NaturalKey = string | Chunk[]

const EMPTY_CHUNKS: Chunk[] = []

interface PreparedSort {
    keys: unknown[]
    missing: Uint8Array | null
    compare: (left: unknown, right: unknown) => number
    desc: boolean
    isInverted: boolean
    undefinedPriority: false | -1 | 1 | 'first' | 'last' | undefined
    fastKind: 'number' | 'string' | 'other'
}

const builtins = /* @__PURE__ */ Object.entries(sortFns).map(([name, fn]) => ({
    fn,
    resolve: fn.resolveDataValue,
    compare: fn.sort,
    natural: name === 'alphanumeric' || name === 'alphanumericCaseSensitive',
    text: name === 'text' || name === 'textCaseSensitive',
    caseInsensitive: name === 'alphanumeric' || name === 'text',
    basic: name === 'basic',
    datetime: name === 'datetime',
}))

function toLowerAsciiFast(text: string): string {
    for (let i = 0; i < text.length; i += 1) {
        const code = text.charCodeAt(i)
        if ((code >= 65 && code <= 90) || code > 127) return text.toLowerCase()
    }
    return text
}

function toNaturalKey(text: string): NaturalKey {
    const len = text.length
    if (len === 0) return EMPTY_CHUNKS
    let firstDigit = -1
    for (let i = 0; i < len; i += 1) {
        const code = text.charCodeAt(i)
        if (code >= 48 && code <= 57) {
            firstDigit = i
            break
        }
    }
    if (firstDigit === -1) return text
    const result: Chunk[] = []
    if (firstDigit > 0) result.push(text.slice(0, firstDigit))
    let start = firstDigit
    while (start < len) {
        const code = text.charCodeAt(start)
        const numeric = code >= 48 && code <= 57
        let end = start + 1
        if (numeric) {
            let num = code - 48
            while (end < len) {
                const next = text.charCodeAt(end)
                if (next < 48 || next > 57) break
                num = num * 10 + (next - 48)
                end += 1
            }
            result.push(
                end - start <= 15
                    ? num
                    : Number.parseInt(text.slice(start, end), 10),
            )
        } else {
            while (end < len) {
                const next = text.charCodeAt(end)
                if (next >= 48 && next <= 57) break
                end += 1
            }
            result.push(text.slice(start, end))
        }
        start = end
    }
    return result
}

function compareNaturalKeys(left: NaturalKey, right: NaturalKey) {
    if (typeof left === 'string') {
        if (typeof right === 'string') {
            return left > right ? 1 : left < right ? -1 : 0
        }
        if (right.length === 0) return 1
        const b = right[0]
        if (typeof b === 'number') return -1
        if (left > b) return 1
        if (left < b) return -1
        return 1 - right.length
    }
    if (typeof right === 'string') {
        if (left.length === 0) return -1
        const a = left[0]
        if (typeof a === 'number') return 1
        if (a > right) return 1
        if (a < right) return -1
        return left.length - 1
    }
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

function compareNumbers(left: number, right: number) {
    return left > right ? 1 : left < right ? -1 : 0
}

function compareStrings(left: string, right: string) {
    return left > right ? 1 : left < right ? -1 : 0
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
    const rowCount = rows.length
    const sortCount = resolved.length
    const rawColumns: unknown[][] = []
    for (let s = 0; s < sortCount; s += 1) rawColumns.push([])
    let monotonicIndex = true
    try {
        if (sortCount === 1) {
            const key = resolved[0]!.key
            const rawColumn = rawColumns[0]!
            for (let r = 0; r < rowCount; r += 1) {
                const row = rows[r]!
                if (row.index !== r) monotonicIndex = false
                const original = row.original
                if (typeof original !== 'object' || original === null) return
                const descriptor = Object.getOwnPropertyDescriptor(
                    original,
                    key,
                )
                if (!descriptor || !Object.hasOwn(descriptor, 'value')) return
                rawColumn.push(descriptor.value)
            }
        } else {
            for (let r = 0; r < rowCount; r += 1) {
                const row = rows[r]!
                if (row.index !== r) monotonicIndex = false
                const original = row.original
                if (typeof original !== 'object' || original === null) return
                for (let s = 0; s < sortCount; s += 1) {
                    const descriptor = Object.getOwnPropertyDescriptor(
                        original,
                        resolved[s]!.key,
                    )
                    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
                        return
                    rawColumns[s]!.push(descriptor.value)
                }
            }
        }
    } catch {
        // Descriptor inspection can throw on a proxy even when ordinary reads work.
        return
    }
    const prepared: PreparedSort[] = []
    for (let s = 0; s < sortCount; s += 1) {
        const sort = resolved[s]!
        const rawColumn = rawColumns[s]!
        const keys: unknown[] = []
        let missing: Uint8Array | null = null
        let values: Map<string | number, unknown> | null = sort.builtin.natural
            ? new Map()
            : null
        let cacheHits = 0
        let allNumbers = sort.builtin.basic || sort.builtin.datetime
        let allPlainStrings = sort.builtin.natural || sort.builtin.text
        const caseInsensitive = sort.builtin.caseInsensitive
        for (let index = 0; index < rowCount; index += 1) {
            const raw = rawColumn[index]
            if (raw === undefined) {
                if (!missing) missing = new Uint8Array(rowCount)
                missing[index] = 1
                allNumbers = false
                allPlainStrings = false
            }
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
            if (sort.builtin.datetime) {
                keys.push(
                    raw === undefined
                        ? undefined
                        : typeof raw === 'number'
                          ? raw
                          : Date.prototype.getTime.call(raw),
                )
                continue
            }
            if (
                values &&
                (typeof raw === 'string' || typeof raw === 'number')
            ) {
                const cachedKey = values.get(raw)
                if (cachedKey !== undefined) {
                    cacheHits += 1
                    keys.push(cachedKey)
                    if (typeof cachedKey !== 'string') allPlainStrings = false
                    continue
                }
            }
            const normalized: unknown =
                typeof raw === 'string' &&
                (sort.builtin.natural || sort.builtin.text)
                    ? caseInsensitive
                        ? toLowerAsciiFast(raw)
                        : raw
                    : sort.builtin.resolve
                      ? sort.builtin.resolve(raw)
                      : raw
            const key =
                sort.builtin.natural && typeof normalized === 'string'
                    ? toNaturalKey(normalized)
                    : normalized
            if (allPlainStrings && typeof key !== 'string') {
                allPlainStrings = false
            }
            if (allNumbers && typeof key !== 'number') {
                allNumbers = false
            }
            keys.push(key)
            if (
                values &&
                (typeof raw === 'string' || typeof raw === 'number')
            ) {
                if (values.size >= 64 && cacheHits === 0) {
                    // Unique column values do not benefit from deduplication.
                    values = null
                } else {
                    if (values.size >= 4096) values.clear()
                    values.set(raw, key)
                }
            }
        }
        // Built-in value comparators ignore row context; identity was checked above.
        const fastKind: PreparedSort['fastKind'] = allNumbers
            ? 'number'
            : allPlainStrings
              ? 'string'
              : 'other'
        const compare =
            fastKind === 'number'
                ? (compareNumbers as (left: unknown, right: unknown) => number)
                : fastKind === 'string'
                  ? (compareStrings as (
                        left: unknown,
                        right: unknown,
                    ) => number)
                  : sort.builtin.natural
                    ? (compareNaturalKeys as (
                          left: unknown,
                          right: unknown,
                      ) => number)
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
            fastKind,
        })
    }
    const indices: number[] = []
    for (let i = 0; i < rowCount; i += 1) indices.push(i)

    if (prepared.length === 1) {
        const sort = prepared[0]!
        const keys = sort.keys
        const dir = (sort.desc ? -1 : 1) * (sort.isInverted ? -1 : 1)
        const priority = sort.undefinedPriority
        const missing = sort.missing
        if (!missing || !priority) {
            if (sort.fastKind === 'number') {
                const numKeys = keys as number[]
                if (monotonicIndex) {
                    indices.sort((left, right) => {
                        const a = numKeys[left]!
                        const b = numKeys[right]!
                        return a > b ? dir : a < b ? -dir : left - right
                    })
                } else {
                    indices.sort((left, right) => {
                        const a = numKeys[left]!
                        const b = numKeys[right]!
                        if (a > b) return dir
                        if (a < b) return -dir
                        return rows[left]!.index - rows[right]!.index
                    })
                }
            } else if (sort.fastKind === 'string') {
                const strKeys = keys as string[]
                if (monotonicIndex) {
                    indices.sort((left, right) => {
                        const a = strKeys[left]!
                        const b = strKeys[right]!
                        return a > b ? dir : a < b ? -dir : left - right
                    })
                } else {
                    indices.sort((left, right) => {
                        const a = strKeys[left]!
                        const b = strKeys[right]!
                        if (a > b) return dir
                        if (a < b) return -dir
                        return rows[left]!.index - rows[right]!.index
                    })
                }
            } else if (
                sort.compare ===
                (compareNaturalKeys as (
                    left: unknown,
                    right: unknown,
                ) => number)
            ) {
                const natKeys = keys as NaturalKey[]
                if (monotonicIndex) {
                    indices.sort((left, right) => {
                        const cmp = compareNaturalKeys(
                            natKeys[left]!,
                            natKeys[right]!,
                        )
                        return cmp !== 0 ? cmp * dir : left - right
                    })
                } else {
                    indices.sort((left, right) => {
                        const cmp = compareNaturalKeys(
                            natKeys[left]!,
                            natKeys[right]!,
                        )
                        return cmp !== 0
                            ? cmp * dir
                            : rows[left]!.index - rows[right]!.index
                    })
                }
            } else {
                const compare = sort.compare
                indices.sort((left, right) => {
                    const cmp = compare(keys[left], keys[right])
                    if (cmp !== 0) return cmp * dir
                    return monotonicIndex
                        ? left - right
                        : rows[left]!.index - rows[right]!.index
                })
            }
        } else {
            const compare = sort.compare
            indices.sort((left, right) => {
                const aMissing = missing[left] === 1
                const bMissing = missing[right] === 1
                if (aMissing || bMissing) {
                    if (aMissing && bMissing) {
                        return monotonicIndex
                            ? left - right
                            : rows[left]!.index - rows[right]!.index
                    }
                    if (priority === 'first') return aMissing ? -1 : 1
                    if (priority === 'last') return aMissing ? 1 : -1
                    return (aMissing ? priority : -priority) * dir
                }
                const cmp = compare(keys[left], keys[right])
                if (cmp !== 0) return cmp * dir
                return monotonicIndex
                    ? left - right
                    : rows[left]!.index - rows[right]!.index
            })
        }
    } else {
        indices.sort((left, right) => {
            for (let s = 0; s < prepared.length; s += 1) {
                const sort = prepared[s]!
                let comparison = 0
                const priority = sort.undefinedPriority
                const missing = sort.missing
                if (priority && missing) {
                    const aMissing = missing[left] === 1
                    const bMissing = missing[right] === 1
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
            return monotonicIndex
                ? left - right
                : rows[left]!.index - rows[right]!.index
        })
    }
    const sorted: typeof rows = []
    const flatRows: typeof rows = []
    for (let i = 0; i < rowCount; i += 1) {
        const row = rows[indices[i]!]!
        sorted.push(row)
        flatRows.push(row)
    }
    return { rows: sorted, flatRows, rowsById: model.rowsById }
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

import type {
    TableStateField,
    TableStateSnapshot,
    TableStateStorage,
    TableStateValue,
} from '../../shared/Table/Types/persistence.types.ts'

const stateFields: readonly TableStateField[] = [
    'sorting',
    'columnFilters',
    'globalFilter',
    'columnVisibility',
    'columnSizing',
    'columnOrder',
    'pagination',
    'rowSelection',
    'expanded',
    'showFilters',
    'rowOrder',
]
const invalid = Symbol('invalid table state')

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function isSafeKey(key: string): boolean {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
}

function ownValue(value: object, key: string): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor && 'value' in descriptor ? descriptor.value : invalid
}

function cloneValue(
    value: unknown,
    ancestors = new Set<object>(),
): TableStateValue | typeof invalid {
    if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'string'
    ) {
        return value
    }
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : invalid
    if (typeof value !== 'object' || ancestors.has(value)) return invalid
    if (!Array.isArray(value) && !isPlainRecord(value)) return invalid
    ancestors.add(value)
    try {
        if (Array.isArray(value)) {
            const result: TableStateValue[] = []
            for (let index = 0; index < value.length; index++) {
                const entry = cloneValue(
                    ownValue(value, String(index)),
                    ancestors,
                )
                if (entry === invalid) return invalid
                result.push(entry)
            }
            return result
        }
        const result: Record<string, TableStateValue> = {}
        for (const key of Object.keys(value)) {
            if (!isSafeKey(key)) continue
            const own = ownValue(value, key)
            // Match JSON object semantics for optional fields such as an open date range.
            if (own === undefined) continue
            const entry = cloneValue(own, ancestors)
            if (entry === invalid) return invalid
            result[key] = entry
        }
        return result
    } finally {
        ancestors.delete(value)
    }
}

function cloneFilterValue(value: unknown): TableStateValue | typeof invalid {
    try {
        return cloneValue(value)
    } catch {
        // A hostile proxy or exhausted traversal must not discard other filters.
        return invalid
    }
}

function normalizeMap(
    value: unknown,
    numeric: boolean,
): Record<string, boolean> | Record<string, number> | typeof invalid {
    if (!isPlainRecord(value)) return invalid
    const result: Record<string, boolean | number> = {}
    for (const key of Object.keys(value)) {
        if (!isSafeKey(key)) continue
        const entry = ownValue(value, key)
        if (numeric) {
            if (
                typeof entry !== 'number' ||
                !Number.isFinite(entry) ||
                entry <= 0
            ) {
                return invalid
            }
        } else if (typeof entry !== 'boolean') return invalid
        result[key] = entry as boolean | number
    }
    return result as Record<string, boolean> | Record<string, number>
}

function normalizeField(
    field: TableStateField,
    value: unknown,
    strict: boolean,
): TableStateSnapshot['state'][TableStateField] | typeof invalid {
    switch (field) {
        case 'globalFilter':
            return typeof value === 'string' ? value : invalid
        case 'showFilters':
            return typeof value === 'boolean' ? value : invalid
        case 'columnVisibility':
        case 'rowSelection':
            return normalizeMap(value, false)
        case 'columnSizing':
            return normalizeMap(value, true)
        case 'expanded':
            return value === true ? true : normalizeMap(value, false)
        case 'pagination': {
            if (!isPlainRecord(value)) return invalid
            const pageIndex = ownValue(value, 'pageIndex')
            const pageSize = ownValue(value, 'pageSize')
            if (
                typeof pageIndex !== 'number' ||
                !Number.isSafeInteger(pageIndex) ||
                pageIndex < 0 ||
                typeof pageSize !== 'number' ||
                !Number.isSafeInteger(pageSize) ||
                pageSize < 1
            )
                return invalid
            return { pageIndex, pageSize }
        }
        case 'columnOrder':
        case 'rowOrder': {
            if (!Array.isArray(value)) return invalid
            const result: string[] = []
            for (let index = 0; index < value.length; index++) {
                const entry = ownValue(value, String(index))
                if (typeof entry !== 'string') return invalid
                if (field === 'columnOrder' && (!entry || !isSafeKey(entry) || result.includes(entry))) return invalid
                result.push(entry)
            }
            return result
        }
        case 'sorting': {
            if (!Array.isArray(value)) return invalid
            const result: { id: string; desc: boolean }[] = []
            for (const entry of value) {
                if (!isPlainRecord(entry)) return invalid
                const id = ownValue(entry, 'id')
                const desc = ownValue(entry, 'desc')
                if (typeof id !== 'string' || typeof desc !== 'boolean')
                    return invalid
                result.push({ id, desc })
            }
            return result
        }
        case 'columnFilters': {
            if (!Array.isArray(value)) return invalid
            const result: { id: string; value: TableStateValue }[] = []
            for (const entry of value) {
                if (!isPlainRecord(entry)) {
                    if (strict) return invalid
                    continue
                }
                const id = ownValue(entry, 'id')
                const cloned = cloneFilterValue(ownValue(entry, 'value'))
                if (typeof id !== 'string' || cloned === invalid) {
                    if (strict) return invalid
                    continue
                }
                result.push({ id, value: cloned })
            }
            return result
        }
    }
}

function normalizeState(
    value: unknown,
    fields: readonly TableStateField[] | undefined,
    strict: boolean,
): TableStateSnapshot | null {
    if (!isPlainRecord(value)) return strict ? null : { version: 1, state: {} }
    const state: TableStateSnapshot['state'] = {}
    for (const field of stateFields) {
        if (fields && !fields.includes(field)) continue
        if (!Object.hasOwn(value, field)) continue
        const normalized = normalizeField(field, ownValue(value, field), strict)
        if (normalized === invalid) {
            if (strict) return null
            continue
        }
        // Each value was validated against the schema selected by its field.
        Object.defineProperty(state, field, {
            value: normalized,
            enumerable: true,
            writable: true,
            configurable: true,
        })
    }
    return { version: 1, state }
}

export function normalizeTableStateSnapshot(
    value: unknown,
    fields?: readonly TableStateField[],
): TableStateSnapshot | null {
    try {
        if (!isPlainRecord(value) || ownValue(value, 'version') !== 1)
            return null
        return normalizeState(ownValue(value, 'state'), fields, true)
    } catch {
        // Untrusted accessors, proxies and excessively deep values cannot restore state.
        return null
    }
}

export function createTableStateSnapshot(
    state: unknown,
    fields?: readonly TableStateField[],
): TableStateSnapshot {
    try {
        return normalizeState(state, fields, false) ?? { version: 1, state: {} }
    } catch {
        return { version: 1, state: {} }
    }
}

export function createBrowserTableStateStorage(
    kind: 'local' | 'session',
): TableStateStorage {
    const storage = () => {
        if (typeof window === 'undefined') {
            throw new Error('Table persistence requires browser storage')
        }
        return kind === 'local' ? window.localStorage : window.sessionStorage
    }
    return {
        load(key) {
            const value = storage().getItem(key)
            return value === null ? null : JSON.parse(value)
        },
        save(key, snapshot) {
            storage().setItem(key, JSON.stringify(snapshot))
        },
        remove(key) {
            storage().removeItem(key)
        },
    }
}

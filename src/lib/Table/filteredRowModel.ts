/* eslint-disable no-underscore-dangle -- Guarded TanStack compatibility requires upstream member names. */
import {
    columnFilteringFeature,
    columnOrderingFeature,
    columnResizingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    coreFeatures,
    createCoreRowModel,
    createFilteredRowModel,
    globalFilteringFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    skipFirstRun,
    tableMemo,
} from '@tanstack/react-table'
import type {
    Atoms_All,
    RowData,
    RowModel,
    Table,
    TableFeatures,
} from '@tanstack/react-table'

// These stock features cannot expose a newly constructed flat Row to a callback.
// Filtering alone initializes Row data, creating both public metadata maps.
const stockFeatures = /* @__PURE__ */ new Set<object>([
    .../* @__PURE__ */ Object.values(coreFeatures),
    columnFilteringFeature,
    columnOrderingFeature,
    columnResizingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
])
const initializeFilterMaps = columnFilteringFeature.initRowInstanceData
const constructionKeys = [
    '_displayIndexCache',
    '_uniqueValuesCache',
    '_valuesCache',
    'depth',
    'id',
    'index',
    'original',
    'parentId',
    'subRows',
    'columnFilters',
    'columnFiltersMeta',
]

interface Provenance {
    owned: boolean
    model?: object
    available: boolean
}

/**
 * Keep native row construction; omit only an unobservable second map allocation.
 * Provenance requires the stock getCoreRowModel/getPreFilteredRowModel pipeline.
 * Replacing those methods with callbacks that expose Rows inside the owned read
 * is outside this factory's contract; ordinary public Row/getValue access is safe.
 */
export function createCoordinatedFilteredRowModels() {
    const provenance = new WeakMap<object, Provenance>()
    const getProvenance = (table: object): Provenance => {
        let current = provenance.get(table)
        if (!current) {
            current = { owned: false, available: false }
            provenance.set(table, current)
        }
        return current
    }
    return {
        coreRowModel: <TFeatures extends TableFeatures, TData extends RowData>(
            table: Table<TFeatures, TData>,
        ) => {
            const native = createCoreRowModel<TFeatures, TData>()(table)
            const current = getProvenance(table)
            const initializers = [...table._rowInstanceInitFns]
            return () => {
                const previousPrototype = table._rowPrototype
                const model = native()
                if (model !== current.model) {
                    current.model = model
                    current.available =
                        current.owned &&
                        !table.options.getSubRows &&
                        (!previousPrototype ||
                            table._rowPrototype === previousPrototype) &&
                        table._rowPrototype !== undefined &&
                        Object.getPrototypeOf(table._rowPrototype) ===
                            Object.prototype &&
                        constructionKeys.every(
                            (key) =>
                                !Object.hasOwn(table._rowPrototype ?? {}, key),
                        ) &&
                        table._rowInstanceInitFns.length ===
                            initializers.length &&
                        table._rowInstanceInitFns.every(
                            (fn, index) => fn === initializers[index],
                        ) &&
                        columnFilteringFeature.initRowInstanceData ===
                            initializeFilterMaps &&
                        Object.entries(table._features).every(
                            ([key, feature]) =>
                                stockFeatures.has(feature) ||
                                (key === 'coreReactivityFeature' &&
                                    feature === table._reactivity &&
                                    !('initRowInstanceData' in feature) &&
                                    !('assignRowPrototype' in feature)),
                        )
                }
                // Any ordinary core/pre-filter read exposes the public maps.
                if (!current.owned) current.available = false
                return model
            }
        },
        filteredRowModel: <
            TFeatures extends TableFeatures,
            TData extends RowData,
        >(
            table: Table<TFeatures, TData>,
        ) => {
            const native = createFilteredRowModel<TFeatures, TData>()(table)
            const current = getProvenance(table)
            const atoms = table.atoms as Atoms_All
            let initialized = false
            let previousModel: RowModel<TFeatures, TData> | undefined
            let previousFilters: unknown
            let previousGlobal: unknown
            const resets: boolean[] = []
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
                feature: 'columnFilteringFeature',
                table,
                fnName: 'table.getFilteredRowModel',
                memoDeps: () => {
                    let model: RowModel<TFeatures, TData>
                    current.owned = true
                    try {
                        model = table.getPreFilteredRowModel()
                    } finally {
                        current.owned = false
                    }
                    return [
                        model,
                        atoms.columnFilters?.get(),
                        atoms.globalFilter?.get(),
                    ] as const
                },
                fn: (model, filters, global) => {
                    const unfiltered =
                        !filters?.length &&
                        (global === undefined ||
                            global === null ||
                            global === '')
                    if (
                        current.available &&
                        current.model === model &&
                        unfiltered
                    ) {
                        current.available = false
                        resets.push(true)
                        return model
                    }
                    current.available = false
                    const recomputes =
                        !initialized ||
                        model !== previousModel ||
                        filters !== previousFilters ||
                        global !== previousGlobal
                    const ownsReset = !initialized || !recomputes
                    const result = native()
                    initialized = true
                    previousModel = model
                    previousFilters = filters
                    previousGlobal = global
                    resets.push(ownsReset)
                    return result
                },
                onAfterUpdate: () => {
                    resetCurrent = resets.shift() ?? false
                    reset()
                },
            })
        },
    }
}

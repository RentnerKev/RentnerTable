import type { DataTableClassNames } from '../../shared/Table/Types/dataTable.types.ts'

/** Undefined inherits; an empty string deliberately removes visual defaults. */
export function mergeTableClassNames(
    inherited: DataTableClassNames,
    local?: DataTableClassNames,
): DataTableClassNames {
    const result = { ...inherited }
    for (const key of Object.keys(local ?? {}) as Array<
        keyof DataTableClassNames
    >) {
        if (local?.[key] !== undefined) result[key] = local[key]
    }
    return result
}

export function getTableSlotClassName(
    defaults: string,
    override?: string,
): string {
    return override ?? defaults
}

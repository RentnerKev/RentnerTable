import type { DataTableClassNames } from '../../shared/Table/Types/dataTable.types.ts'

/** Undefined inherits; an empty string deliberately removes visual defaults. */
export function mergeTableClassNames(
    inherited: DataTableClassNames,
    local?: DataTableClassNames,
): DataTableClassNames {
    if (!local || local === inherited) return inherited
    let result: DataTableClassNames | undefined
    for (const key of Object.keys(local) as Array<keyof DataTableClassNames>) {
        const value = local[key]
        if (value !== undefined && value !== inherited[key]) {
            ;(result ??= { ...inherited })[key] = value
        }
    }
    return result ?? inherited
}

export function getTableSlotClassName(
    defaults: string,
    override?: string,
): string {
    return override ?? defaults
}

import type { DataTableClassNames } from './dataTable.types.ts'

export interface TableStyleOptions {
    classNames?: DataTableClassNames
    /** Subtle separators between column headings. Defaults to false. */
    headerDividers?: boolean
}

export interface TableStylesLogicResult {
    state: {
        classNames: DataTableClassNames
        headerDividers: boolean
    }
}

export type TableButtonSlot =
    | 'filterButton'
    | 'columnVisibilityButton'
    | 'resetFiltersButton'
    | 'paginationButton'
    | 'expandButton'

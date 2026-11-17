import type { Column, Row, RowData } from '@tanstack/react-table'
import type { ComponentPropsWithRef, ReactNode, Ref, RefObject } from 'react'
import type {
    TablePersistenceOptions,
    TablePersistenceStatus,
    TableStateController,
} from './persistence.types.ts'
import type { TableStyleOptions, TableButtonSlot } from './styling.types.ts'
import type { MenuItem } from '@rentnerkev/menu'
import type { TableDateRange, TableDateRangeOptions } from './column.types.ts'
import type { rentnerTableFeatures } from '../../../lib/Table/table.ts'
import type {
    TableRowEvents,
    TableRowOrderChange,
} from './interaction.types.ts'
import type {
    RentnerTableInstance,
    RentnerTableOptions,
    TableColumnWidthMode,
    TableLogicResult,
    TableLocale,
    TableLocaleOption,
    TableMessages,
    TableSize,
} from './table.types.ts'

export type TableRow<TData extends RowData> = Row<
    typeof rentnerTableFeatures,
    TData
>
export type TableColumnInstance<TData extends RowData> = Column<
    typeof rentnerTableFeatures,
    TData,
    unknown
>

export interface DataTableContext<TData extends RowData> {
    table: RentnerTableInstance<TData>
    selectedRows: readonly TableRow<TData>[]
}

export type TablePageSizeOption = number | { value: number; label: string }

export type TableSearchValue =
    string | number | boolean | bigint | Date | null | undefined

export interface DataTableClassNames {
    root?: string
    toolbar?: string
    filters?: string
    viewport?: string
    table?: string
    header?: string
    headerCell?: string
    row?: string
    cell?: string
    footer?: string
    columnSettings?: string
    /** New visual slots replace defaults; existing container slots remain additive. */
    button?: string
    buttonActive?: string
    filterButton?: string
    filterButtonActive?: string
    filterBadge?: string
    columnVisibilityButton?: string
    resetFiltersButton?: string
    paginationButton?: string
    paginationIcon?: string
    paginationNav?: string
    pageInfo?: string
    pageSizeSelect?: string
    sortButton?: string
    sortIcon?: string
    headerDivider?: string
    expandButton?: string
    expandIcon?: string
    expandedRow?: string
    expandedCell?: string
    expandedContent?: string
    toolbarControls?: string
    title?: string
    description?: string
}

export type DataTableLogicOptions<TData extends RowData> = Pick<
    RentnerTableOptions<TData>,
    'data' | 'columns'
> & {
    /** Stable record identity, independent of position, for selection and reordering. */
    getRowId: (row: TData, index: number) => string
    locale?: TableLocaleOption
    messages?: Partial<TableMessages>
    /** Localized plural noun used in the default footer range. */
    rowLabel?: string
    pagination?: boolean
    pageSize?: number
    pageSizeOptions?: readonly TablePageSizeOption[]
    /** Search values from each record, including fields without a column. */
    getSearchValues?: (row: TData) => readonly TableSearchValue[]
    selectable?: boolean | ((row: TableRow<TData>) => boolean)
    getRowLabel?: (row: TData) => string
    renderExpandedRow?: (row: TableRow<TData>) => ReactNode
    expansionMode?: 'multiple' | 'single'
    /** Controls single-row expansion. Use null to close the details row. */
    expandedRowId?: string | null
    onExpandedRowIdChange?: (rowId: string | null) => void
    /** Hide the default expand controls while keeping rendered row details. */
    showExpandColumn?: boolean
    initialShowFilters?: boolean
    /** Opt in with a unique per-user/table key; defaults to localStorage. */
    persistence?: false | string | TablePersistenceOptions
    /** Export/restore state, flush before navigation, clear or reload saved preferences. */
    stateRef?: Ref<TableStateController>
    isLoading?: boolean
    /** Enable horizontal drag handles and keyboard column resizing. Defaults to false. */
    resizableColumns?: boolean
    /** Enable drag handles, row previews and keyboard reordering. Clear sorting to reorder. */
    reorderableRows?: boolean
    /** Receive the reordered input data. With this callback, the caller owns and updates data. */
    onRowOrderChange?: (data: TData[], change: TableRowOrderChange) => void
    tableOptions?: Omit<
        RentnerTableOptions<TData>,
        'data' | 'columns' | 'getRowId' | 'enableRowSelection'
    >
    portalContainer?: Element | DocumentFragment | null
}

export type DataTableProps<TData extends RowData> =
    DataTableLogicOptions<TData> &
        TableRowEvents<TData> & {
            tableProps?: Omit<
                ComponentPropsWithRef<'table'>,
                'children' | 'dangerouslySetInnerHTML'
            >
            title?: ReactNode
            description?: ReactNode
            icon?: ReactNode
            /** Show the row count next to the table title. Defaults to true. */
            showRowCount?: boolean
            searchable?: boolean
            searchPlaceholder?: string
            /** Defaults to 200; match an application's existing server search contract. */
            searchMaxLength?: number
            columnFilters?: boolean
            columnVisibility?: boolean
            /** Edit order, visibility and widths in an isolated draft. Defaults to false. */
            columnSettings?: boolean
            isRefreshing?: boolean
            error?: ReactNode
            onRetry?: () => void
            emptyState?: ReactNode
            loadingState?: ReactNode
            noResultsState?: ReactNode
            size?: TableSize
            striped?: boolean
            stickyHeader?: boolean
            /** Keep resizable columns at their minimum widths in narrow containers. */
            columnWidthMode?: TableColumnWidthMode
            dateRangeOptions?: TableDateRangeOptions
            className?: string
            classNames?: DataTableClassNames
            headerDividers?: boolean
            /** Toggle expandable rows from non-interactive row content. Defaults to false. */
            expandOnRowClick?: boolean
            toolbarActions?:
                ReactNode | ((context: DataTableContext<TData>) => ReactNode)
            bulkActions?: (context: DataTableContext<TData>) => ReactNode
            rowClassName?: (row: TableRow<TData>) => string | undefined
        }

export interface DataTableLogicResult<TData extends RowData> {
    table: RentnerTableInstance<TData>
    state: TableLogicResult<TData>['state'] & {
        id: string
        search: string
        showFilters: boolean
        filterSummary: string
        persistenceStatus: TablePersistenceStatus
        persistenceError: unknown
        hasFilters: boolean
        filterCount: number
        filterColumns: TableColumnInstance<TData>[]
        columnItems: MenuItem[]
        selectedRows: TableRow<TData>[]
        selectionCount: number
        selectionEnabled: boolean
        canSelectPage: boolean
        allPageSelected: boolean
        somePageSelected: boolean
        firstRow: number
        lastRow: number
        totalRows: number | null
        totalPages: number | null
        page: number
        pageSize: number
        pageSizes: { value: number; label: string }[]
        canPreviousPage: boolean
        canNextPage: boolean
        portalContainer: Element | DocumentFragment | null
    }
    handler: {
        handleSearch: (value: string) => void
        handleToggleFilters: () => void
        handleResetFilters: () => void
        handleClearSelection: () => void
        handleSelectPage: () => void
        handlePageSize: (value: number) => void
        handleFirstPage: () => void
        handlePreviousPage: () => void
        handleNextPage: () => void
        handleLastPage: () => void
        handleRowReorder: (activeId: string, overId: string) => void
        handleGetState: TableStateController['getState']
        handleRestoreState: TableStateController['restoreState']
        handleFlushState: TableStateController['flush']
        handleClearStoredState: TableStateController['clear']
        handleReloadState: TableStateController['reload']
    }
    refs: { root: (element: HTMLElement | null) => void }
}

export type DataTableToolbarProps<TData extends RowData> = {
    state: DataTableLogicResult<TData>['state']
    handler: DataTableLogicResult<TData>['handler']
    options: Pick<
        DataTableProps<TData>,
        | 'title'
        | 'description'
        | 'icon'
        | 'showRowCount'
        | 'searchable'
        | 'searchPlaceholder'
        | 'searchMaxLength'
        | 'columnFilters'
        | 'columnVisibility'
        | 'columnSettings'
        | 'locale'
        | 'persistence'
        | 'toolbarActions'
        | 'bulkActions'
        | 'isLoading'
        | 'isRefreshing'
    >
    table: RentnerTableInstance<TData>
    className?: string
}

export type TableSurfaceProps<TData extends RowData> = Omit<
    ComponentPropsWithRef<'table'>,
    'children'
> &
    TableRowEvents<TData> & {
        table: RentnerTableInstance<TData>
        view: TableLogicResult<TData>['state']
        caption?: ReactNode
        size?: TableSize
        striped?: boolean
        isLoading?: boolean
        emptyState?: ReactNode
        loadingState?: ReactNode
        noResultsState?: ReactNode
        hasFilters?: boolean
        filterSummary?: string
        error?: ReactNode
        onRetry?: () => void
        onResetFilters?: () => void
        containerClassName?: string
        embedded?: boolean
        stickyHeader?: boolean
        headerDividers?: boolean
        expandOnRowClick?: boolean
        classNames?: DataTableClassNames
        rowClassName?: DataTableProps<TData>['rowClassName']
        selection?: DataTableLogicResult<TData>['state']
        onSelectPage?: () => void
        getRowLabel?: (row: TData) => string
        renderExpandedRow?: (row: TableRow<TData>) => ReactNode
        showExpandColumn?: boolean
        detailsId?: string
        filters?: ReactNode
        detailedStates?: boolean
        resizableColumns?: boolean
        columnWidthMode?: TableColumnWidthMode
        reorderableRows?: boolean
        onRowReorder?: (activeId: string, overId: string) => void
    }

export type TableButtonProps = ComponentPropsWithRef<'button'> & {
    active?: boolean
    iconOnly?: boolean
    slot?: TableButtonSlot
}
export interface TableCheckboxProps {
    checked: boolean
    indeterminate?: boolean
    disabled?: boolean
    label: string
    onChange: () => void
}
export interface TableCheckboxLogicResult {
    refs: { input: RefObject<HTMLInputElement | null> }
}

export interface TableColumnFilterProps<TData extends RowData> {
    column: TableColumnInstance<TData>
    locale: TableLocale
    messages: TableMessages
    dateRangeOptions?: TableDateRangeOptions
    disabled?: boolean
}

export interface DataTableFiltersProps<TData extends RowData> {
    state: Pick<
        DataTableLogicResult<TData>['state'],
        'id' | 'filterColumns' | 'messages'
    >
    locale: TableLocale
    dateRangeOptions?: TableDateRangeOptions
    disabled?: boolean
    className?: string
}

export interface TableDateRangeFilterProps {
    value: unknown
    onValueChange: (value: TableDateRange) => void
    label: string
    placeholder?: string
    locale: TableLocale
    calendarOptions?: TableDateRangeOptions
    calendarMessages?: TableMessages['calendar']
    disabled?: boolean
}

export type TableHeadProps<TData extends RowData> = Pick<
    TableSurfaceProps<TData>,
    | 'table'
    | 'view'
    | 'selection'
    | 'onSelectPage'
    | 'isLoading'
    | 'filters'
    | 'classNames'
    | 'stickyHeader'
    | 'resizableColumns'
    | 'reorderableRows'
    | 'headerDividers'
> & { resizeAvailableWidth?: number; hasExpandColumn?: boolean }
export type TableBodyProps<TData extends RowData> = Pick<
    TableSurfaceProps<TData>,
    | 'table'
    | 'view'
    | 'selection'
    | 'renderExpandedRow'
    | 'showExpandColumn'
    | 'getRowLabel'
    | 'detailsId'
    | 'classNames'
    | 'rowClassName'
    | 'isLoading'
    | 'striped'
    | 'reorderableRows'
    | 'resizableColumns'
    | 'onRowClick'
    | 'expandOnRowClick'
    | 'onRowDoubleClick'
    | 'onRowContextMenu'
    | 'onCellClick'
    | 'onCellDoubleClick'
    | 'onCellContextMenu'
>
export type TableStatusProps = Pick<
    TableSurfaceProps<object>,
    | 'isLoading'
    | 'loadingState'
    | 'emptyState'
    | 'noResultsState'
    | 'hasFilters'
    | 'filterSummary'
    | 'error'
    | 'onRetry'
    | 'onResetFilters'
    | 'detailedStates'
> & { view: { columnCount: number; messages: TableMessages } }
export type DataTablePaginationProps<TData extends RowData> = {
    state: DataTableLogicResult<TData>['state']
    handler: DataTableLogicResult<TData>['handler']
    locale: TableLocale
    pagination: boolean
    disabled?: boolean
    className?: string
}

export interface TableRowActionsProps {
    label: string
    items: readonly MenuItem[]
    disabled?: boolean
}

export interface TableProviderProps extends TableStyleOptions {
    children: ReactNode
    portalContainer?: Element | DocumentFragment | null
}

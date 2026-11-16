import type { RowData } from '@tanstack/react-table'
import { TextInput } from '@rentnerkev/inputs/text-input'
import { Menu } from '@rentnerkev/menu/menu'
import {
    ChevronDown,
    Columns3,
    ListFilter,
    RefreshCw,
    RotateCcw,
    Search,
    X,
} from 'lucide-react'
import { getTableSlotClassName } from '../../../lib/Table/styling.ts'
import { useTableStyles } from '../Hooks/useTableStyles.ts'
import { TableButton } from './TableButton.tsx'
import type { DataTableToolbarProps } from '../Types/dataTable.types.ts'

export function DataTableToolbar<TData extends RowData>({
    table,
    state,
    handler,
    options,
    className = '',
}: DataTableToolbarProps<TData>) {
    const { state: styles } = useTableStyles()
    const classNames = styles.classNames
    return (
        <div className={`border-b border-rentner-border ${className}`}>
            <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    {options.icon && (
                        <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rentner-accent/20 bg-rentner-accent/10 text-rentner-accent"
                        >
                            {options.icon}
                        </span>
                    )}
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2
                                id={`${state.id}-title`}
                                className={getTableSlotClassName(
                                    'text-base font-semibold tracking-tight text-rentner-foreground',
                                    classNames.title,
                                )}
                            >
                                {options.title ?? state.messages.title}
                            </h2>
                            {state.totalRows !== null && (
                                <span className="rounded-md border border-rentner-border bg-rentner-control px-2 py-0.5 text-xs tabular-nums text-rentner-muted">
                                    {state.totalRows}
                                </span>
                            )}
                            {options.isRefreshing && (
                                <RefreshCw
                                    aria-label={state.messages.loading}
                                    className="size-3.5 motion-safe:animate-spin text-rentner-accent"
                                />
                            )}
                        </div>
                        {options.description && (
                            <p
                                className={getTableSlotClassName(
                                    'mt-1 text-sm leading-relaxed text-rentner-muted',
                                    classNames.description,
                                )}
                            >
                                {options.description}
                            </p>
                        )}
                    </div>
                </div>
                <div
                    className={getTableSlotClassName(
                        'flex flex-wrap items-center gap-2',
                        classNames.toolbarControls,
                    )}
                >
                    {options.searchable !== false && (
                        <div className="w-full sm:w-64">
                            <TextInput
                                type="text"
                                value={state.search}
                                onValueChange={handler.handleSearch}
                                aria-label={state.messages.search}
                                placeholder={
                                    options.searchPlaceholder ??
                                    state.messages.searchPlaceholder
                                }
                                maxLength={200}
                                icon={
                                    <Search
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                }
                                controlSize="sm"
                                disabled={options.isLoading}
                            />
                        </div>
                    )}
                    {options.columnFilters !== false && (
                        <TableButton
                            slot="filterButton"
                            onClick={handler.handleToggleFilters}
                            aria-pressed={state.showFilters}
                            aria-expanded={state.showFilters}
                            aria-controls={`${state.id}-filters`}
                            active={state.showFilters || state.filterCount > 0}
                            disabled={
                                options.isLoading ||
                                !state.filterColumns.some((column) =>
                                    column.getCanFilter(),
                                )
                            }
                        >
                            <ListFilter aria-hidden="true" className="size-4" />
                            {state.messages.filters}
                            {state.filterCount > 0 && (
                                <span
                                    className={getTableSlotClassName(
                                        'rounded bg-rentner-surface px-1.5 tabular-nums text-rentner-foreground',
                                        classNames.filterBadge,
                                    )}
                                >
                                    {state.filterCount}
                                </span>
                            )}
                        </TableButton>
                    )}
                    {options.columnVisibility !== false && (
                        <Menu
                            ariaLabel={state.messages.columns}
                            items={state.columnItems}
                            align="end"
                            controlSize="sm"
                            disabled={options.isLoading}
                            asChild
                            trigger={
                                <TableButton slot="columnVisibilityButton">
                                    <Columns3
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    {state.messages.columns}
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="size-3"
                                    />
                                </TableButton>
                            }
                        />
                    )}
                    {state.hasFilters && (
                        <TableButton
                            iconOnly
                            slot="resetFiltersButton"
                            aria-label={state.messages.resetFilters}
                            title={state.messages.resetFilters}
                            onClick={handler.handleResetFilters}
                        >
                            <RotateCcw aria-hidden="true" className="size-4" />
                        </TableButton>
                    )}
                    {typeof options.toolbarActions === 'function'
                        ? options.toolbarActions({
                              table,
                              selectedRows: state.selectedRows,
                          })
                        : options.toolbarActions}
                </div>
            </div>
            {state.selectionCount > 0 && (
                <section
                    aria-label={state.messages.selected(state.selectionCount)}
                    className="flex flex-wrap items-center gap-3 border-t border-rentner-accent/15 bg-rentner-accent/5 px-5 py-3"
                >
                    <span className="text-sm font-medium tabular-nums text-rentner-accent">
                        {state.messages.selected(state.selectionCount)}
                    </span>
                    <TableButton
                        iconOnly
                        aria-label={state.messages.clearSelection}
                        onClick={handler.handleClearSelection}
                        className="border-transparent bg-transparent"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </TableButton>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {options.bulkActions?.({
                            table,
                            selectedRows: state.selectedRows,
                        })}
                    </div>
                </section>
            )}
        </div>
    )
}

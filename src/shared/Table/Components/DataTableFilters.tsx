import type { RowData } from '@tanstack/react-table'
import { getColumnLabel } from '../../../lib/Table/presentation.ts'
import type { DataTableFiltersProps } from '../Types/dataTable.types.ts'
import { TableColumnFilter } from './TableColumnFilter.tsx'
import { useTableStyles } from '../Hooks/useTableStyles.ts'
import { getTableSlotClassName } from '../../../lib/Table/styling.ts'

export function DataTableFilters<TData extends RowData>({
    state,
    locale,
    disabled,
    className = '',
}: DataTableFiltersProps<TData>) {
    const { state: styles } = useTableStyles()
    return (
        <section
            id={`${state.id}-filters`}
            aria-label={state.messages.filters}
            className={`@container border-b border-rentner-border ${className}`}
        >
            <div
                className={getTableSlotClassName(
                    'grid grid-cols-1 gap-x-5 gap-y-4 p-5 @xl:grid-cols-2 @4xl:grid-cols-3',
                    styles.classNames.filterGrid,
                )}
            >
                {state.filterColumns.map(
                    (column) =>
                        column.getCanFilter() && (
                            <fieldset
                                key={column.id}
                                data-column-id={column.id}
                                disabled={disabled}
                                className={`${getTableSlotClassName('m-0 min-w-0 border-0 p-0', styles.classNames.filterField)} ${column.columnDef.meta?.filterClassName ?? ''}`}
                            >
                                <legend className="mb-2 w-full p-0 text-sm font-medium text-rentner-muted">
                                    {getColumnLabel(column)}
                                </legend>
                                <TableColumnFilter
                                    column={column}
                                    locale={locale}
                                    messages={state.messages}
                                    disabled={disabled}
                                />
                            </fieldset>
                        ),
                )}
            </div>
        </section>
    )
}

import type { RowData } from '@tanstack/react-table'
import { lazy, Suspense } from 'react'
import { TextInput } from '@rentnerkev/inputs/text-input'
import { CustomSelect } from '@rentnerkev/select/select'
import { getColumnLabel } from '../../../lib/Table/presentation.ts'
import type { TableColumnFilterProps } from '../Types/dataTable.types.ts'

const TableDateRangeFilter = lazy(() => import('./TableDateRangeFilter.tsx'))

export function TableColumnFilter<TData extends RowData>({
    column,
    locale,
    messages,
    disabled,
}: TableColumnFilterProps<TData>) {
    const config = column.columnDef.meta?.filter
    const value = column.getFilterValue()
    const label = messages.filterColumn(getColumnLabel(column))
    if (config?.type === 'custom')
        return config.render({
            value,
            onValueChange: (next) => column.setFilterValue(next),
            label,
        })
    if (config?.type === 'select')
        return (
            <CustomSelect
                options={config.options}
                value={typeof value === 'string' ? value : ''}
                onValueChange={(next) => column.setFilterValue(next)}
                aria-label={label}
                placeholder={config.placeholder ?? messages.all}
                clearable
                emptyValue=""
                controlSize="sm"
                disabled={disabled}
                locale={locale}
                className="min-w-32"
            />
        )
    if (config?.type === 'dateRange')
        return (
            <Suspense
                fallback={
                    <span className="text-xs text-rentner-muted">{label}</span>
                }
            >
                <TableDateRangeFilter
                    value={value}
                    onValueChange={(next) => column.setFilterValue(next)}
                    label={label}
                    placeholder={config.placeholder}
                    locale={locale}
                    disabled={disabled}
                />
            </Suspense>
        )
    return (
        <TextInput
            value={typeof value === 'string' ? value : ''}
            onValueChange={(next) => column.setFilterValue(next)}
            aria-label={label}
            placeholder={config?.placeholder ?? label}
            maxLength={config?.maxLength ?? 200}
            controlSize="sm"
            disabled={disabled}
            className="min-w-28"
        />
    )
}

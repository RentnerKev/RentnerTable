import { RangeCalendar } from '@rentnerkev/calendar/range-calendar'
import { getTableDateRange } from '../../../lib/Table/filters.ts'
import type { TableDateRangeFilterProps } from '../Types/dataTable.types.ts'
import { useTableOverlay } from '../Hooks/useTableOverlay.ts'

export default function TableDateRangeFilter({
    value,
    onValueChange,
    label,
    placeholder,
    locale,
    disabled,
}: TableDateRangeFilterProps) {
    const portalContainer = useTableOverlay()
    return (
        <RangeCalendar
            valueFormat="iso-date"
            value={[
                getTableDateRange(value).from ?? null,
                getTableDateRange(value).to ?? null,
            ]}
            onChange={(range) =>
                onValueChange({
                    from: range?.[0] ?? undefined,
                    to: range?.[1] ?? undefined,
                })
            }
            aria-label={label}
            placeholder={placeholder ?? label}
            locale={locale}
            controlSize="md"
            isDeletable
            disabled={disabled}
            portalContainer={portalContainer}
            className="w-full min-w-0 text-left"
        />
    )
}

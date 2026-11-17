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
    calendarOptions,
    calendarMessages,
    disabled,
}: TableDateRangeFilterProps) {
    const portalContainer = useTableOverlay()
    const { from, to } = getTableDateRange(value)
    return (
        <RangeCalendar
            valueFormat="iso-date"
            value={[from ?? null, to ?? null]}
            onChange={(range) =>
                onValueChange({
                    from: range?.[0] ?? undefined,
                    to: range?.[1] ?? undefined,
                })
            }
            aria-label={label}
            placeholder={placeholder ?? label}
            locale={calendarOptions?.locale ?? locale}
            weekStartsOn={calendarOptions?.weekStartsOn}
            showHolidays={calendarOptions?.showHolidays}
            fastEdit={calendarOptions?.fastEdit}
            backdrop={calendarOptions?.backdrop}
            messages={calendarMessages}
            controlSize="md"
            isDeletable
            disabled={disabled}
            portalContainer={portalContainer}
            className="w-full min-w-0 text-left"
        />
    )
}

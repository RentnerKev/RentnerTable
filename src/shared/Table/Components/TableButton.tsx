import type { TableButtonProps } from '../Types/dataTable.types.ts'
import { useInheritedTableStyles } from '../Hooks/useTableStyles.ts'

const baseButtonClasses =
    'relative inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-2 motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rentner-accent disabled:cursor-not-allowed disabled:opacity-40'
const defaultVisualBase =
    'rounded-lg border border-rentner-border text-xs font-medium text-rentner-muted hover:bg-rentner-control hover:text-rentner-foreground data-[active=true]:bg-rentner-control data-[active=true]:text-rentner-foreground'
const defaultActiveClass =
    'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-rentner-accent'

export function TableButton({
    className = '',
    active,
    iconOnly,
    slot,
    type = 'button',
    ...props
}: TableButtonProps) {
    const state = useInheritedTableStyles()
    const visualClass =
        (slot && state.classNames[slot]) ??
        state.classNames.button ??
        `${defaultVisualBase} ${slot === 'expandButton' ? 'border-transparent bg-transparent' : 'bg-rentner-control/40'} ${iconOnly ? 'size-9' : 'px-3 py-2'}`
    const activeClass = active
        ? ((slot === 'filterButton'
              ? state.classNames.filterButtonActive
              : undefined) ??
          state.classNames.buttonActive ??
          defaultActiveClass)
        : ''
    return (
        <button
            {...props}
            type={type}
            data-active={active || undefined}
            data-table-slot={slot ?? 'button'}
            className={`${baseButtonClasses} ${visualClass} ${activeClass} ${className}`}
        />
    )
}

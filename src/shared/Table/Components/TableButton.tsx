import type { TableButtonProps } from '../Types/dataTable.types.ts'

export function TableButton({
    className = '',
    active,
    iconOnly,
    type = 'button',
    ...props
}: TableButtonProps) {
    return (
        <button
            {...props}
            type={type}
            data-active={active || undefined}
            className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-rentner-border bg-rentner-control/40 text-xs font-medium text-rentner-muted motion-safe:transition-colors hover:bg-rentner-control hover:text-rentner-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rentner-accent disabled:cursor-not-allowed disabled:opacity-40 data-[active=true]:border-rentner-accent/30 data-[active=true]:bg-rentner-accent/10 data-[active=true]:text-rentner-accent ${iconOnly ? 'size-9' : 'px-3 py-2'} ${className}`}
        />
    )
}

import type { RowData } from '@tanstack/react-table'
import type { TableColumnResizeHandleProps } from '../Types/interaction.types.ts'
import { useTableResizeHandleLogic } from '../Hooks/useTableResizeHandleLogic.ts'

export function TableResizeHandle<TData extends RowData>(
    props: TableColumnResizeHandleProps<TData>,
) {
    const {
        state,
        handler,
        refs: { element: handleRef },
    } = useTableResizeHandleLogic(props)
    return (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- A focusable separator implements the keyboard column-resizing pattern.
        <hr
            ref={handleRef}
            aria-orientation="vertical"
            aria-label={state.label}
            title={state.resetLabel}
            aria-valuenow={Math.round(state.size)}
            aria-valuemin={Math.round(state.min)}
            aria-valuemax={Math.round(state.max)}
            aria-disabled={props.disabled || undefined}
            tabIndex={props.disabled ? -1 : 0}
            data-resizing={state.isResizing || undefined}
            onMouseDown={handler.handleStart}
            onTouchStart={handler.handleStart}
            onDoubleClick={handler.handleReset}
            onKeyDown={handler.handleKeyDown}
            style={{
                transform: `translateX(${state.offset}px)`,
            }}
            className="[background-image:linear-gradient(currentColor,currentColor)] [background-size:3px_calc((100%_-_var(--spacing)*4)*0.65)] bg-right bg-no-repeat rtl:bg-left absolute inset-y-0 end-0 z-20 m-0 h-full w-3 touch-none cursor-col-resize select-none border-0 text-rentner-muted/70 outline-none! hover:text-rentner-accent focus-visible:text-rentner-accent data-[resizing=true]:text-rentner-accent aria-disabled:cursor-default"
        />
    )
}

import type { RowData } from '@tanstack/react-table'
import type { TableColumnResizeHandleProps } from '../Types/interaction.types.ts'
import { useTableResizeHandleLogic } from '../Hooks/useTableResizeHandleLogic.ts'

export function TableResizeHandle<TData extends RowData>(
    props: TableColumnResizeHandleProps<TData>,
) {
    const { state, handler } = useTableResizeHandleLogic(props)
    return (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- A focusable separator implements the keyboard column-resizing pattern.
        <hr
            aria-orientation="vertical"
            aria-label={state.label}
            title={state.resetLabel}
            aria-valuenow={Math.round(state.size)}
            aria-valuemin={state.min}
            aria-valuemax={state.max}
            aria-disabled={props.disabled || undefined}
            tabIndex={props.disabled ? -1 : 0}
            data-resizing={state.isResizing || undefined}
            onMouseDown={handler.handleStart}
            onTouchStart={handler.handleStart}
            onDoubleClick={handler.handleReset}
            onKeyDown={handler.handleKeyDown}
            style={{
                transform: `translateX(${state.offset}px)`,
                backgroundImage: 'linear-gradient(currentColor, currentColor)',
                backgroundSize: '2px 45%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
            className="absolute inset-y-0 end-0 z-20 m-0 h-full w-3 touch-none cursor-col-resize border-0 text-rentner-border outline-none hover:text-rentner-accent focus-visible:bg-rentner-accent/15 focus-visible:text-rentner-accent data-[resizing=true]:text-rentner-accent aria-disabled:cursor-default"
        />
    )
}

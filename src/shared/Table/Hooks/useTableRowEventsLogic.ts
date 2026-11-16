import type { MouseEvent } from 'react'
import type { RowData } from '@tanstack/react-table'
import type { TableRow } from '../Types/dataTable.types.ts'
import type {
    TableRowEvents,
    TableRowEventOptions,
} from '../Types/interaction.types.ts'
import { isTableEventElement } from '../../../lib/Table/events.ts'

function isControl(event: MouseEvent<HTMLTableRowElement>): boolean {
    const target = event.target
    return (
        isTableEventElement(target) &&
        target.closest(
            'button, a, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [role="textbox"], [role="slider"], [role="spinbutton"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-no-row-click]',
        ) !== null
    )
}

export function useTableRowEventsLogic<TData extends RowData>(
    row: TableRow<TData>,
    callbacks: TableRowEvents<TData>,
    options: TableRowEventOptions = {},
) {
    return {
        handler: {
            handleClick: (event: MouseEvent<HTMLTableRowElement>) => {
                if (
                    event.defaultPrevented ||
                    isControl(event) ||
                    options.isLoading
                )
                    return
                callbacks.onRowClick?.(row, event)
                // Native double clicks contain two click events; expand only once.
                if (
                    !event.defaultPrevented &&
                    options.expandOnRowClick &&
                    event.detail <= 1 &&
                    row.getCanExpand()
                ) {
                    row.toggleExpanded()
                }
            },
            handleDoubleClick: (event: MouseEvent<HTMLTableRowElement>) => {
                if (
                    !event.defaultPrevented &&
                    !isControl(event) &&
                    !options.isLoading
                )
                    callbacks.onRowDoubleClick?.(row, event)
            },
            handleContextMenu: (event: MouseEvent<HTMLTableRowElement>) => {
                if (!event.defaultPrevented)
                    callbacks.onRowContextMenu?.(row, event)
            },
        },
    }
}

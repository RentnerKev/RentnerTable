import type { RowData } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import { ChevronRight, GripVertical } from 'lucide-react'
import { TableCheckbox } from './TableCheckbox.tsx'
import { TableButton } from './TableButton.tsx'
import type { TableDataRowProps } from '../Types/interaction.types.ts'
import { getTableSlotClassName } from '../../../lib/Table/styling.ts'
import { useTableRowEventsLogic } from '../Hooks/useTableRowEventsLogic.ts'

export function TableDataRow<TData extends RowData>({
    view,
    selection,
    renderExpandedRow,
    getRowLabel,
    detailsId,
    classNames,
    rowClassName,
    isLoading,
    row,
    index,
    striped,
    dragHandle,
    reorderableRows,
    resizableColumns,
    onRowClick,
    expandOnRowClick,
    onRowDoubleClick,
    onRowContextMenu,
    onCellClick,
    onCellDoubleClick,
    onCellContextMenu,
}: TableDataRowProps<TData>) {
    const { handler } = useTableRowEventsLogic(
        row,
        {
            onRowClick,
            onRowDoubleClick,
            onRowContextMenu,
        },
        {
            expandOnRowClick: Boolean(expandOnRowClick && renderExpandedRow),
            isLoading,
        },
    )
    return (
        <>
            {/* Optional mouse notifications supplement the accessible controls rendered inside cells. */}
            <tr
                data-row-id={row.id}
                data-clickable={
                    Boolean(
                        !isLoading &&
                        (onRowClick ||
                            onRowDoubleClick ||
                            (expandOnRowClick &&
                                renderExpandedRow &&
                                row.getCanExpand())),
                    ) || undefined
                }
                data-stripe={striped && index % 2 === 1 ? true : undefined}
                onClick={
                    onRowClick || (expandOnRowClick && renderExpandedRow)
                        ? handler.handleClick
                        : undefined
                }
                onDoubleClick={
                    onRowDoubleClick ? handler.handleDoubleClick : undefined
                }
                onContextMenu={
                    onRowContextMenu ? handler.handleContextMenu : undefined
                }
                data-selected={
                    (selection?.selectionEnabled && row.getIsSelected()) ||
                    undefined
                }
                className={`data-[clickable=true]:cursor-pointer border-b border-rentner-border motion-safe:transition-colors group-data-[striped=true]/table:data-[stripe=true]:bg-rentner-control/25 hover:bg-rentner-control/70 hover:shadow-[inset_3px_0_0_var(--rentner-accent,#13ecd6)] data-[selected=true]:bg-rentner-accent/5 ${classNames?.row ?? ''} ${rowClassName?.(row) ?? ''}`}
            >
                {reorderableRows && (
                    <td className="w-12 px-2 py-3">
                        {dragHandle ?? (
                            <TableButton
                                iconOnly
                                disabled
                                aria-label={
                                    view.messages.moveRow?.(
                                        getRowLabel?.(row.original) ?? row.id,
                                    ) ?? `Move ${row.id}`
                                }
                            >
                                <GripVertical
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </TableButton>
                        )}
                    </td>
                )}
                {selection?.selectionEnabled && (
                    <td className="w-12 px-4 py-3">
                        <TableCheckbox
                            checked={row.getIsSelected()}
                            disabled={isLoading || !row.getCanSelect()}
                            label={view.messages.selectRow(
                                getRowLabel?.(row.original) ?? row.id,
                            )}
                            onChange={() => row.toggleSelected()}
                        />
                    </td>
                )}
                {renderExpandedRow && (
                    <td className="w-10 px-1">
                        <TableButton
                            iconOnly
                            slot="expandButton"
                            disabled={isLoading || !row.getCanExpand()}
                            aria-label={
                                row.getIsExpanded()
                                    ? view.messages.collapseRow(
                                          getRowLabel?.(row.original) ?? row.id,
                                      )
                                    : view.messages.expandRow(
                                          getRowLabel?.(row.original) ?? row.id,
                                      )
                            }
                            aria-expanded={row.getIsExpanded()}
                            aria-controls={`${detailsId}-${encodeURIComponent(row.id)}`}
                            onClick={row.getToggleExpandedHandler()}
                        >
                            <ChevronRight
                                aria-hidden="true"
                                className={`${getTableSlotClassName('size-4', classNames?.expandIcon)} ${row.getIsExpanded() ? 'rotate-90' : ''}`}
                            />
                        </TableButton>
                    </td>
                )}
                {row.getVisibleCells().map((cell) => (
                    // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- The column renderer owns accessible cell content.
                    <td
                        key={cell.id}
                        data-column-id={cell.column.id}
                        onClick={
                            onCellClick
                                ? (event) => onCellClick(cell, event)
                                : undefined
                        }
                        onDoubleClick={
                            onCellDoubleClick
                                ? (event) => onCellDoubleClick(cell, event)
                                : undefined
                        }
                        onContextMenu={
                            onCellContextMenu
                                ? (event) => onCellContextMenu(cell, event)
                                : undefined
                        }
                        data-align={cell.column.columnDef.meta?.align}
                        style={
                            resizableColumns ||
                            cell.column.columnDef.size === undefined
                                ? undefined
                                : { width: cell.column.getSize() }
                        }
                        className={`px-4 py-3 align-middle group-data-[size=sm]/table:px-3 group-data-[size=sm]/table:py-2 group-data-[size=lg]/table:px-5 group-data-[size=lg]/table:py-4 data-[align=center]:text-center data-[align=right]:text-right ${cell.column.columnDef.meta?.cellClassName ?? ''} ${classNames?.cell ?? ''}`}
                    >
                        {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                        )}
                    </td>
                ))}
            </tr>
            {renderExpandedRow && row.getIsExpanded() && (
                <tr
                    data-row-details-for={row.id}
                    className={classNames?.expandedRow}
                >
                    <td
                        colSpan={view.columnCount}
                        className={getTableSlotClassName(
                            'border-b border-rentner-border bg-rentner-control/30 p-5',
                            classNames?.expandedCell,
                        )}
                    >
                        <div
                            id={`${detailsId}-${encodeURIComponent(row.id)}`}
                            className={classNames?.expandedContent}
                        >
                            {renderExpandedRow(row)}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

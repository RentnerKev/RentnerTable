import { Fragment } from 'react'
import type { RowData } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { TableCheckbox } from './TableCheckbox.tsx'
import { TableButton } from './TableButton.tsx'
import type { TableBodyProps } from '../Types/dataTable.types.ts'

export function TableBody<TData extends RowData>({
    table,
    view,
    selection,
    renderExpandedRow,
    getRowLabel,
    detailsId,
    classNames,
    rowClassName,
    isLoading,
}: TableBodyProps<TData>) {
    return (
        <tbody>
            {view.rows.map((row) => (
                <Fragment key={row.id}>
                    <tr
                        data-row-id={row.id}
                        data-selected={
                            (selection?.selectionEnabled &&
                                row.getIsSelected()) ||
                            undefined
                        }
                        className={`border-b border-rentner-border motion-safe:transition-colors last:border-0 hover:bg-rentner-control/70 hover:shadow-[inset_3px_0_0_var(--rentner-accent,#13ecd6)] data-[selected=true]:bg-rentner-accent/5 ${classNames?.row ?? ''} ${rowClassName?.(row) ?? ''}`}
                    >
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
                                    disabled={!row.getCanExpand()}
                                    aria-label={
                                        row.getIsExpanded()
                                            ? view.messages.collapseRow(
                                                  getRowLabel?.(row.original) ??
                                                      row.id,
                                              )
                                            : view.messages.expandRow(
                                                  getRowLabel?.(row.original) ??
                                                      row.id,
                                              )
                                    }
                                    aria-expanded={row.getIsExpanded()}
                                    aria-controls={`${detailsId}-${encodeURIComponent(row.id)}`}
                                    onClick={row.getToggleExpandedHandler()}
                                    className="border-transparent bg-transparent"
                                >
                                    <ChevronRight
                                        aria-hidden="true"
                                        className={`size-4 ${row.getIsExpanded() ? 'rotate-90' : ''}`}
                                    />
                                </TableButton>
                            </td>
                        )}
                        {row.getVisibleCells().map((cell) => (
                            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- The column renderer owns accessible cell content.
                            <td
                                key={cell.id}
                                data-align={cell.column.columnDef.meta?.align}
                                style={
                                    cell.column.columnDef.size === undefined
                                        ? undefined
                                        : { width: cell.column.getSize() }
                                }
                                className={`px-4 py-3 align-middle group-data-[size=sm]/table:px-3 group-data-[size=sm]/table:py-2 group-data-[size=lg]/table:px-5 group-data-[size=lg]/table:py-4 data-[align=center]:text-center data-[align=right]:text-right ${cell.column.columnDef.meta?.cellClassName ?? ''} ${classNames?.cell ?? ''}`}
                            >
                                <table.FlexRender cell={cell} />
                            </td>
                        ))}
                    </tr>
                    {renderExpandedRow && row.getIsExpanded() && (
                        <tr>
                            <td
                                colSpan={view.columnCount}
                                className="border-b border-rentner-border bg-rentner-control/30 p-5"
                            >
                                <div
                                    id={`${detailsId}-${encodeURIComponent(row.id)}`}
                                >
                                    {renderExpandedRow(row)}
                                </div>
                            </td>
                        </tr>
                    )}
                </Fragment>
            ))}
        </tbody>
    )
}

import type { RowData } from '@tanstack/react-table'
import type { TableBodyProps } from '../Types/dataTable.types.ts'
import { TableDataRow } from './TableDataRow.tsx'
import { useTableRowDragContext } from '../Hooks/useTableRowDragContext.ts'

export function TableBody<TData extends RowData>(props: TableBodyProps<TData>) {
    const DragGroup = useTableRowDragContext()
    return DragGroup ? (
        <>
            {props.view.rows.map((row, index) => (
                <DragGroup
                    key={row.id}
                    id={row.id}
                    label={props.getRowLabel?.(row.original) ?? row.id}
                >
                    {(handle) => (
                        <TableDataRow
                            {...props}
                            row={row}
                            index={index}
                            dragHandle={handle}
                        />
                    )}
                </DragGroup>
            ))}
        </>
    ) : (
        <tbody>
            {props.view.rows.map((row, index) => (
                <TableDataRow key={row.id} {...props} row={row} index={index} />
            ))}
        </tbody>
    )
}

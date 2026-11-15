import type { RowData } from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { TableCheckbox } from './TableCheckbox.tsx'
import { TableResizeHandle } from './TableResizeHandle.tsx'
import type { TableHeadProps } from '../Types/dataTable.types.ts'

export function TableHead<TData extends RowData>({
    table,
    view,
    selection,
    onSelectPage,
    renderExpandedRow,
    isLoading,
    filters,
    classNames,
    stickyHeader,
    resizableColumns,
    reorderableRows,
}: TableHeadProps<TData>) {
    return (
        <thead
            className={`${stickyHeader ? 'sticky top-0 z-10' : ''} border-b-2 border-rentner-accent/80 bg-rentner-control text-xs text-rentner-muted ${classNames?.header ?? ''}`}
        >
            {view.headerGroups.map((group, index) => (
                <tr key={group.id}>
                    {index === 0 && reorderableRows && (
                        <th
                            scope="col"
                            rowSpan={view.headerGroups.length}
                            className="w-12 px-2 py-3"
                        >
                            <span className="sr-only">
                                {view.messages.moveRows ?? 'Reorder rows'}
                            </span>
                        </th>
                    )}
                    {index === 0 && selection?.selectionEnabled && (
                        <th
                            scope="col"
                            rowSpan={view.headerGroups.length}
                            className="w-12 px-4 py-3"
                        >
                            <TableCheckbox
                                checked={selection.allPageSelected}
                                indeterminate={
                                    selection.somePageSelected &&
                                    !selection.allPageSelected
                                }
                                disabled={isLoading || !selection.canSelectPage}
                                label={view.messages.selectPage}
                                onChange={
                                    onSelectPage ??
                                    (() => table.toggleAllPageRowsSelected())
                                }
                            />
                        </th>
                    )}
                    {index === 0 && renderExpandedRow && (
                        <th
                            scope="col"
                            rowSpan={view.headerGroups.length}
                            className="w-10 px-2"
                        >
                            <span className="sr-only">
                                {view.messages.expandRow('')}
                            </span>
                            <ChevronRight
                                aria-hidden="true"
                                className="size-4 opacity-0"
                            />
                        </th>
                    )}
                    {group.headers.map((item) => (
                        <th
                            key={item.header.id}
                            colSpan={item.header.colSpan}
                            scope={item.header.colSpan > 1 ? 'colgroup' : 'col'}
                            aria-hidden={item.header.isPlaceholder || undefined}
                            aria-sort={item.sortDirection}
                            data-column-id={
                                !item.header.isPlaceholder
                                    ? item.header.column.id
                                    : undefined
                            }
                            data-align={
                                item.header.column.columnDef.meta?.align
                            }
                            style={
                                resizableColumns ||
                                item.header.column.columnDef.size === undefined
                                    ? undefined
                                    : { width: item.header.column.getSize() }
                            }
                            className={`relative py-3 font-medium group-data-[size=sm]/table:py-2 group-data-[size=lg]/table:py-4 ${resizableColumns ? 'px-0' : 'px-4 group-data-[size=sm]/table:px-3 group-data-[size=lg]/table:px-5'} data-[align=center]:text-center data-[align=right]:text-right ${item.header.column.columnDef.meta?.headerClassName ?? ''} ${classNames?.headerCell ?? ''}`}
                        >
                            <div
                                className={
                                    resizableColumns
                                        ? 'min-w-0 overflow-hidden'
                                        : undefined
                                }
                            >
                                <div
                                    className={
                                        resizableColumns
                                            ? 'px-4 group-data-[size=sm]/table:px-3 group-data-[size=lg]/table:px-5'
                                            : undefined
                                    }
                                >
                                    {item.canSort ? (
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={item.header.column.getToggleSortingHandler()}
                                            data-align={
                                                item.header.column.columnDef
                                                    .meta?.align
                                            }
                                            className={`group/sort relative flex w-full items-center gap-2 rounded-sm text-left motion-safe:transition-colors hover:text-rentner-foreground focus-visible:outline-2 ${resizableColumns ? 'focus-visible:-outline-offset-2' : 'focus-visible:outline-offset-4'} focus-visible:outline-rentner-accent disabled:cursor-wait disabled:opacity-60 data-[align=center]:justify-center data-[align=center]:text-center data-[align=right]:justify-end data-[align=right]:text-right`}
                                        >
                                            <span className="min-w-0 truncate">
                                                <table.FlexRender
                                                    header={item.header}
                                                />
                                            </span>
                                            <span className="sr-only">
                                                {' '}
                                                — {item.sortAction}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="ml-auto shrink-0 text-rentner-accent group-data-[align=center]/sort:ml-0 group-data-[align=right]/sort:ml-0"
                                            >
                                                {item.sortIndicator}
                                            </span>
                                        </button>
                                    ) : (
                                        !item.header.isPlaceholder && (
                                            <table.FlexRender
                                                header={item.header}
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                            {resizableColumns &&
                                !item.header.isPlaceholder &&
                                item.header.column.columns.length === 0 &&
                                item.header.column.getCanResize() && (
                                    <TableResizeHandle
                                        table={table}
                                        header={item.header}
                                        messages={view.messages}
                                        disabled={isLoading}
                                    />
                                )}
                        </th>
                    ))}
                </tr>
            ))}
            {filters}
        </thead>
    )
}

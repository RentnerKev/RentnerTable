import { Inbox, RefreshCw, SearchX, TriangleAlert } from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import type { TableStatusProps } from '../Types/dataTable.types.ts'

export function TableStatus({
    view,
    isLoading,
    loadingState,
    emptyState,
    noResultsState,
    hasFilters,
    error,
    onRetry,
    onResetFilters,
    detailedStates,
}: TableStatusProps) {
    return (
        <tbody>
            <tr>
                <td
                    colSpan={view.columnCount}
                    className="px-5 py-14 text-center text-rentner-muted"
                >
                    {error != null && error !== false ? (
                        <div
                            role="alert"
                            className="flex flex-col items-center gap-3"
                        >
                            <TriangleAlert
                                aria-hidden="true"
                                className="size-8 text-rentner-danger"
                            />
                            <p className="font-medium text-rentner-foreground">
                                {error === true ? view.messages.error : error}
                            </p>
                            {onRetry && (
                                <TableButton onClick={onRetry}>
                                    <RefreshCw
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    {view.messages.retry}
                                </TableButton>
                            )}
                        </div>
                    ) : (
                        <output className="inline-flex flex-col items-center gap-3">
                            {isLoading ? (
                                <>
                                    <RefreshCw
                                        aria-hidden="true"
                                        className="size-7 motion-safe:animate-spin text-rentner-accent"
                                    />
                                    <span>
                                        {loadingState ?? view.messages.loading}
                                    </span>
                                </>
                            ) : !detailedStates ? (
                                (emptyState ?? view.messages.empty)
                            ) : (
                                ((hasFilters ? noResultsState : emptyState) ?? (
                                    <>
                                        {hasFilters ? (
                                            <SearchX
                                                aria-hidden="true"
                                                className="size-8"
                                            />
                                        ) : (
                                            <Inbox
                                                aria-hidden="true"
                                                className="size-8"
                                            />
                                        )}
                                        <span className="font-medium text-rentner-foreground">
                                            {hasFilters
                                                ? (noResultsState ??
                                                  view.messages.noResults)
                                                : (emptyState ??
                                                  view.messages.empty)}
                                        </span>
                                        <span className="text-sm">
                                            {hasFilters
                                                ? view.messages
                                                      .noResultsDescription
                                                : view.messages
                                                      .emptyDescription}
                                        </span>
                                    </>
                                ))
                            )}
                        </output>
                    )}
                    {!isLoading &&
                        (error == null || error === false) &&
                        hasFilters &&
                        onResetFilters && (
                            <div className="mt-4">
                                <TableButton onClick={onResetFilters}>
                                    {view.messages.resetFilters}
                                </TableButton>
                            </div>
                        )}
                </td>
            </tr>
        </tbody>
    )
}

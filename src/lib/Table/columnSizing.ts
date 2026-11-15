export interface ResizeColumn {
    id: string
    size: number
    min: number
    max: number
    resizable: boolean
}

/** Fit widths without changing the caller's persisted sizing preferences. */
export function fitColumnWidths(
    columns: readonly ResizeColumn[],
    available: number,
): ResizeColumn[] {
    const fitted = columns.map((column) => ({ ...column }))
    const total = fitted.reduce((sum, column) => sum + column.size, 0)
    const budget = Math.max(0, available)
    if (total <= budget) return fitted

    const capacity = fitted.reduce(
        (sum, column) =>
            sum +
            (column.resizable ? Math.max(0, column.size - column.min) : 0),
        0,
    )
    const reduction = Math.min(total - budget, capacity)
    if (capacity > 0) {
        for (const column of fitted) {
            if (column.resizable)
                column.size -=
                    (Math.max(0, column.size - column.min) / capacity) *
                    reduction
        }
    }

    // On viewports narrower than the configured minima, responsive presentation
    // must also fit. Keep those minima intact in the persisted columnSizing.
    const remaining = total - reduction
    if (remaining > budget) {
        for (const column of fitted) column.size *= budget / remaining
    }
    for (const column of fitted) column.min = Math.min(column.min, column.size)
    return fitted
}

export function getColumnResizeMaximum(
    columns: readonly ResizeColumn[],
    available: number,
    id: string,
): number {
    const column = columns.find((item) => item.id === id)
    if (!column) return 0
    const total = columns.reduce((sum, item) => sum + item.size, 0)
    const capacity = columns.reduce(
        (sum, item) =>
            sum +
            (item.id !== id && item.resizable
                ? Math.max(0, item.size - item.min)
                : 0),
        0,
    )
    return Math.min(
        column.max,
        column.size + Math.max(0, available - total) + capacity,
    )
}

/** Growing a leaf borrows space from resizable peers, stopping at their minima. */
export function resizeColumnWidths(
    columns: readonly ResizeColumn[],
    available: number,
    id: string,
    requested: number,
): Record<string, number> {
    const fitted = fitColumnWidths(columns, available)
    const target = fitted.find((column) => column.id === id)
    if (!target?.resizable) return {}
    const maximum = getColumnResizeMaximum(fitted, available, id)
    const size = Math.min(maximum, Math.max(target.min, requested))
    const total = fitted.reduce((sum, column) => sum + column.size, 0)
    const reduction = Math.max(
        0,
        size - target.size - Math.max(0, available - total),
    )
    const capacity = fitted.reduce(
        (sum, column) =>
            sum +
            (column.id !== id && column.resizable
                ? Math.max(0, column.size - column.min)
                : 0),
        0,
    )
    return Object.fromEntries(
        fitted.map((column) => [
            column.id,
            column.id === id
                ? size
                : column.size -
                  (column.resizable && capacity > 0
                      ? (Math.max(0, column.size - column.min) / capacity) *
                        reduction
                      : 0),
        ]),
    )
}

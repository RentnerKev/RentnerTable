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
    fill = false,
): ResizeColumn[] {
    const fitted = columns.map((column) => ({ ...column }))
    const total = fitted.reduce((sum, column) => sum + column.size, 0)
    const budget = Math.max(0, available)
    if (total <= budget) {
        if (fill && Number.isFinite(budget)) {
            let remaining = budget - total
            let growing = fitted.filter(
                (column) => column.resizable && column.size < column.max,
            )
            while (remaining > 0.001 && growing.length > 0) {
                const weight = growing.reduce(
                    (sum, column) => sum + Math.max(1, column.size),
                    0,
                )
                let distributed = 0
                for (const column of growing) {
                    const growth = Math.min(
                        column.max - column.size,
                        (remaining * Math.max(1, column.size)) / weight,
                    )
                    column.size += growth
                    distributed += growth
                }
                if (distributed <= 0) break
                remaining -= distributed
                growing = growing.filter((column) => column.size < column.max)
            }
        }
        return fitted
    }

    const capacity = fitted.reduce(
        (sum, column) =>
            sum +
            (column.resizable ? Math.max(0, column.size - column.min) : 0),
        0,
    )
    const reduction = Math.min(total - budget, capacity)
    if (capacity > 0) {
        for (const column of fitted) {
            if (column.resizable) {
                column.size -=
                    (Math.max(0, column.size - column.min) / capacity) *
                    reduction
            }
        }
    }

    // Responsive fitting is separate from user resizing and keeps persisted minima.
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
    const targetIndex = columns.findIndex((column) => column.id === id)
    const target = columns[targetIndex]
    if (!target) return 0
    const total = columns.reduce((sum, column) => sum + column.size, 0)
    const capacity = columns
        .slice(targetIndex + 1)
        .reduce(
            (sum, column) =>
                sum +
                (column.resizable ? Math.max(0, column.size - column.min) : 0),
            0,
        )
    return Math.min(
        target.max,
        target.size + Math.max(0, available - total) + capacity,
    )
}

/** Only following resizable leaves lend width; preceding boundaries stay fixed. */
export function resizeColumnWidths(
    columns: readonly ResizeColumn[],
    available: number,
    id: string,
    requested: number,
): Record<string, number> {
    const fitted = fitColumnWidths(columns, available)
    const targetIndex = fitted.findIndex((column) => column.id === id)
    const target = fitted[targetIndex]
    if (!target?.resizable) return {}
    const maximum = getColumnResizeMaximum(fitted, available, id)
    const size = Math.min(maximum, Math.max(target.min, requested))
    const total = fitted.reduce((sum, column) => sum + column.size, 0)
    const reduction = Math.max(
        0,
        size - target.size - Math.max(0, available - total),
    )
    const capacity = fitted
        .slice(targetIndex + 1)
        .reduce(
            (sum, column) =>
                sum +
                (column.resizable ? Math.max(0, column.size - column.min) : 0),
            0,
        )
    return Object.fromEntries(
        fitted.map((column, index) => [
            column.id,
            index === targetIndex
                ? size
                : column.size -
                  (index > targetIndex && column.resizable && capacity > 0
                      ? (Math.max(0, column.size - column.min) / capacity) *
                        reduction
                      : 0),
        ]),
    )
}

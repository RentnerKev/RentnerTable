export interface ResizeColumn {
    id: string
    size: number
    min: number
    max: number
    resizable: boolean
}

function getColumnMinimumWidth(column: ResizeColumn): number {
    return column.resizable ? Math.min(column.min, column.size) : column.size
}

export function getMinimumColumnWidth(
    columns: readonly ResizeColumn[],
): number {
    return columns.reduce(
        (sum, column) => sum + getColumnMinimumWidth(column),
        0,
    )
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

    const minimum = getMinimumColumnWidth(fitted)
    if (budget <= minimum) {
        const scale = budget < minimum ? budget / minimum : 1
        for (const column of fitted)
            column.size = getColumnMinimumWidth(column) * scale
    } else {
        const remaining = (budget - minimum) / (total - minimum)
        for (const column of fitted) {
            const lowerBound = getColumnMinimumWidth(column)
            column.size = lowerBound + (column.size - lowerBound) * remaining
        }
    }
    // Responsive fitting is separate from user resizing and keeps persisted minima.
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
    const len = fitted.length
    let targetIndex = -1
    let total = 0
    for (let i = 0; i < len; i += 1) {
        const col = fitted[i]!
        total += col.size
        if (targetIndex === -1 && col.id === id) targetIndex = i
    }
    const target = targetIndex >= 0 ? fitted[targetIndex] : undefined
    if (!target?.resizable) return {}
    let capacity = 0
    for (let i = targetIndex + 1; i < len; i += 1) {
        const col = fitted[i]!
        if (col.resizable && col.size > col.min) {
            capacity += col.size - col.min
        }
    }
    const free = Math.max(0, available - total)
    const maximum = Math.min(target.max, target.size + free + capacity)
    const size = Math.min(maximum, Math.max(target.min, requested))
    const reduction = Math.max(0, size - target.size - free)
    const result: Record<string, number> = {}
    const reductionRatio = capacity > 0 ? reduction / capacity : 0
    for (let i = 0; i < len; i += 1) {
        const col = fitted[i]!
        if (i === targetIndex) {
            result[col.id] = size
        } else if (i > targetIndex && col.resizable && reductionRatio > 0) {
            result[col.id] =
                col.size - Math.max(0, col.size - col.min) * reductionRatio
        } else {
            result[col.id] = col.size
        }
    }
    return result
}

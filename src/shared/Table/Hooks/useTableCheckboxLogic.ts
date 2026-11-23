import { useEffect, useRef } from 'react'
import type { TableCheckboxLogicResult } from '../Types/dataTable.types.ts'

export function useTableCheckboxLogic(
    indeterminate: boolean,
): TableCheckboxLogicResult {
    const input = useRef<HTMLInputElement>(null)
    const applied = useRef(false)
    useEffect(() => {
        if (input.current && (indeterminate || applied.current)) {
            input.current.indeterminate = indeterminate
            applied.current = indeterminate
        }
    }, [indeterminate])
    return { refs: { input } }
}

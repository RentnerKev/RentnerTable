import { useEffect, useRef } from 'react'
import type { TableCheckboxLogicResult } from '../Types/dataTable.types.ts'

export function useTableCheckboxLogic(
    indeterminate: boolean,
): TableCheckboxLogicResult {
    const input = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (input.current) input.current.indeterminate = indeterminate
    }, [indeterminate])
    return { refs: { input } }
}

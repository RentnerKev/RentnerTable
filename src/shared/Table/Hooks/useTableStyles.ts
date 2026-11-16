'use client'

import { createContext, useContext, useMemo } from 'react'
import { mergeTableClassNames } from '../../../lib/Table/styling.ts'
import type {
    TableStyleOptions,
    TableStylesLogicResult,
} from '../Types/styling.types.ts'

export const TableStyleContext = createContext<TableStylesLogicResult['state']>(
    {
        classNames: {},
        headerDividers: false,
    },
)

export function useTableStyles({
    classNames,
    headerDividers,
}: TableStyleOptions = {}): TableStylesLogicResult {
    const inherited = useContext(TableStyleContext)
    const state = useMemo(
        () => ({
            classNames: mergeTableClassNames(inherited.classNames, classNames),
            headerDividers: headerDividers ?? inherited.headerDividers,
        }),
        [classNames, headerDividers, inherited],
    )
    return { state }
}

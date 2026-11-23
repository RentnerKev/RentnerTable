'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { mergeTableClassNames } from '../../../lib/Table/styling.ts'
import type {
    TableStyleOptions,
    TableStylesLogicResult,
} from '../Types/styling.types.ts'

const defaultTableStyleState: TableStylesLogicResult['state'] = {
    classNames: {},
    headerDividers: false,
}

export const TableStyleContext = /* @__PURE__ */ createContext<
    TableStylesLogicResult['state']
>(defaultTableStyleState)

function shallowEqualRecord(a: object, b: object): boolean {
    const keysA = Object.keys(a)
    if (keysA.length !== Object.keys(b).length) return false
    const recA = a as Record<string, unknown>
    const recB = b as Record<string, unknown>
    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i]!
        if (!Object.is(recA[key], recB[key])) return false
    }
    return true
}

function useStableOptionalRecord<T extends object>(
    value: T | undefined,
): T | undefined {
    const [stable, setStable] = useState(value)
    if (stable === value) return stable
    if (stable && value && shallowEqualRecord(stable, value)) return stable
    setStable(value)
    return value
}

export function useInheritedTableStyles(): TableStylesLogicResult['state'] {
    return useContext(TableStyleContext)
}

export function useTableStyles({
    classNames,
    headerDividers,
}: TableStyleOptions = {}): TableStylesLogicResult {
    const inherited = useContext(TableStyleContext)
    const stableClassNames = useStableOptionalRecord(classNames)
    const state = useMemo(() => {
        const mergedClassNames = mergeTableClassNames(
            inherited.classNames,
            stableClassNames,
        )
        const nextHeaderDividers = headerDividers ?? inherited.headerDividers
        if (
            mergedClassNames === inherited.classNames &&
            nextHeaderDividers === inherited.headerDividers
        )
            return inherited
        return {
            classNames: mergedClassNames,
            headerDividers: nextHeaderDividers,
        }
    }, [stableClassNames, headerDividers, inherited])
    return { state }
}

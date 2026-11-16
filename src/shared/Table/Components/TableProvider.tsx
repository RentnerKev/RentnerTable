'use client'

import { MenuProvider } from '@rentnerkev/menu/provider'
import { SelectProvider } from '@rentnerkev/select'
import {
    TableOverlayContext,
    useTableOverlay,
} from '../Hooks/useTableOverlay.ts'
import { TableStyleContext, useTableStyles } from '../Hooks/useTableStyles.ts'
import type { TableProviderProps } from '../Types/dataTable.types.ts'

export function TableProvider({
    children,
    portalContainer,
    classNames,
    headerDividers,
}: TableProviderProps) {
    const { state } = useTableStyles({ classNames, headerDividers })
    const inheritedPortal = useTableOverlay()
    const portal =
        portalContainer === undefined ? inheritedPortal : portalContainer

    return (
        <TableStyleContext.Provider value={state}>
            <TableOverlayContext.Provider value={portal}>
                <MenuProvider portalContainer={portal}>
                    <SelectProvider portalContainer={portal}>
                        {children}
                    </SelectProvider>
                </MenuProvider>
            </TableOverlayContext.Provider>
        </TableStyleContext.Provider>
    )
}

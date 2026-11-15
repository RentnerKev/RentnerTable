'use client'

import { MenuProvider } from '@rentnerkev/menu/provider'
import { SelectProvider } from '@rentnerkev/select'
import { TableOverlayContext } from '../Hooks/useTableOverlay.ts'
import type { TableProviderProps } from '../Types/dataTable.types.ts'

export function TableProvider({
    children,
    portalContainer,
}: TableProviderProps) {
    return (
        <TableOverlayContext.Provider value={portalContainer}>
            <MenuProvider portalContainer={portalContainer}>
                <SelectProvider portalContainer={portalContainer}>
                    {children}
                </SelectProvider>
            </MenuProvider>
        </TableOverlayContext.Provider>
    )
}

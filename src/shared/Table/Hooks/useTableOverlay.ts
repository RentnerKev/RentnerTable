import { createContext, useContext } from 'react'

export const TableOverlayContext = /* @__PURE__ */ createContext<
    Element | DocumentFragment | null | undefined
>(undefined)

export function useTableOverlay() {
    return useContext(TableOverlayContext)
}

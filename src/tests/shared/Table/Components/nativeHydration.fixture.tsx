import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { getTableMessages } from '../../../../lib/Messages/tableMessages.ts'
import TableNativeReorderProvider from '../../../../shared/Table/Components/TableNativeReorderProvider.tsx'
import { useTableRowDragContext } from '../../../../shared/Table/Hooks/useTableRowDragContext.ts'

function HydrationRows() {
    const Group = useTableRowDragContext()
    return Group
        ? createElement(
              'div',
              { style: { width: 300 } },
              createElement(
                  'table',
                  null,
                  createElement(Group, {
                      id: 'ssr-a',
                      label: 'Hydrated Alpha',
                      children: (handle) =>
                          createElement(
                              'tr',
                              null,
                              createElement('td', null, handle, 'Alpha'),
                          ),
                  }),
              ),
          )
        : null
}

export function hydrationTree() {
    return createElement(TableNativeReorderProvider, {
        rows: [{ id: 'ssr-a' }],
        disabled: false,
        messages: getTableMessages('en'),
        getLabel: () => 'Hydrated Alpha',
        onReorder: () => undefined,
        children: createElement(HydrationRows),
    })
}

export async function hydrateFixture(markup: string) {
    const errors: string[] = []
    const container = document.createElement('section')
    container.dataset.nativeHydration = ''
    container.innerHTML = markup
    document.body.appendChild(container)
    hydrateRoot(container, hydrationTree(), {
        identifierPrefix: 'native-test-',
        onRecoverableError: (error) => errors.push(String(error)),
    })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return errors
}

declare global {
    interface Window {
        hydrateNativeFixture: typeof hydrateFixture
    }
}

if (typeof window !== 'undefined') window.hydrateNativeFixture = hydrateFixture

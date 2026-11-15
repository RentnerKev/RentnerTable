// nodeType also works when the table is rendered into another document or iframe.
export function isTableEventElement(
    target: EventTarget | null,
): target is Element {
    return target !== null && 'nodeType' in target && target.nodeType === 1
}

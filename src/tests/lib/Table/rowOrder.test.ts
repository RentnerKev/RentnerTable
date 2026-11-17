import { describe, expect, test } from 'bun:test'
import {
    applyTableRowOrder,
    moveTableRow,
} from '../../../lib/Table/rowOrder.ts'

const records = Object.freeze([
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
    { id: 'c', name: 'Gamma' },
    { id: 'd', name: 'Delta' },
])
const identify = (row: { id: string }) => row.id

describe('table row ordering', () => {
    test('moves immutable input in both directions and reports the full-data positions', () => {
        const moved = moveTableRow(records, identify, 'a', 'c')
        expect(moved?.data.map(identify)).toEqual(['b', 'c', 'a', 'd'])
        expect(moved?.change).toEqual({
            activeId: 'a',
            overId: 'c',
            fromIndex: 0,
            toIndex: 2,
        })
        expect(
            moveTableRow(records, identify, 'd', 'b')?.data.map(identify),
        ).toEqual(['a', 'd', 'b', 'c'])
        expect(records.map(identify)).toEqual(['a', 'b', 'c', 'd'])
    })
    test('ignores missing and unchanged targets', () => {
        expect(moveTableRow(records, identify, 'missing', 'a')).toBeUndefined()
        expect(moveTableRow(records, identify, 'a', 'missing')).toBeUndefined()
        expect(moveTableRow(records, identify, 'a', 'a')).toBeUndefined()
    })
    test('keeps updated records, removes old IDs and preserves the positions of new records', () => {
        const updated = [
            { id: 'new', name: 'New' },
            { id: 'a', name: 'Edited Alpha' },
            { id: 'c', name: 'Gamma' },
            { id: 'd', name: 'Delta' },
        ]
        const result = applyTableRowOrder(
            updated,
            ['d', 'c', 'b', 'a'],
            identify,
        )
        expect(result.map(identify)).toEqual(['new', 'd', 'c', 'a'])
        expect(result[3]?.name).toBe('Edited Alpha')
        expect(applyTableRowOrder(records, undefined, identify)).toBe(records)
    })
})

test('row moves keep index-derived identity and use the first occurrence of repeated IDs', () => {
    const values = Object.freeze(['same', 'second', 'same', 'last'])
    const indexed = moveTableRow(
        values,
        (_value, index) => String(index),
        '1',
        '3',
    )
    expect(indexed?.data).toEqual(['same', 'same', 'last', 'second'])
    expect(indexed?.change).toEqual({
        activeId: '1',
        overId: '3',
        fromIndex: 1,
        toIndex: 3,
    })
    const repeated = moveTableRow(values, (value) => value, 'same', 'last')
    expect(repeated?.data).toEqual(['second', 'same', 'last', 'same'])
    expect(repeated?.change.fromIndex).toBe(0)
    expect(values).toEqual(['same', 'second', 'same', 'last'])
})

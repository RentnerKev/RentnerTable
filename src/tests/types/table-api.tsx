import { createRef } from 'react'
import {
    Table,
    createTableColumnHelper,
    type TableColumn,
    type TableProps,
} from '../../index.ts'

interface Person {
    id: string
    name: string
    age: number
}
const data: readonly Person[] = [{ id: 'one', name: 'Alex', age: 24 }]
const helper = createTableColumnHelper<Person>()
const columns = helper.columns([
    helper.accessor('name', {
        header: 'Name',
        cell: (cell) => cell.getValue().toUpperCase(),
    }),
    helper.accessor('age', {
        header: 'Age',
        cell: (cell) => cell.getValue().toFixed(0),
    }),
])

export const directColumns: readonly TableColumn<Person>[] = [
    { accessorKey: 'name', header: 'Name' },
]
export const props: TableProps<Person> = {
    data,
    columns,
    getRowId: (row) => row.id,
    locale: 'de',
}
export const example = (
    <Table {...props} ref={createRef<HTMLTableElement>()} aria-label="People" />
)

// @ts-expect-error The column helper only accepts keys belonging to Person.
helper.accessor('missing', {})
// @ts-expect-error Cell values retain the accessor's numeric type.
helper.accessor('age', { cell: (cell) => cell.getValue().toUpperCase() })
// @ts-expect-error Locale names are constrained to supported translations.
export const invalidLocale = <Table {...props} locale="xx" />
// @ts-expect-error The package owns table children through the column definitions.
export const invalidChildren = <Table {...props}>Invalid</Table>

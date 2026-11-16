import { afterEach, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { DataTable } from '../../../../index.ts'

afterEach(cleanup)

test.each([undefined, 1000])(
    'supports application search limits: %s',
    (searchMaxLength) => {
        render(
            <DataTable
                data={[{ id: '1', name: 'Record' }]}
                columns={[{ accessorKey: 'name', header: 'Name' }]}
                getRowId={(row) => row.id}
                searchMaxLength={searchMaxLength}
            />,
        )
        expect(screen.getByRole('textbox').getAttribute('maxlength')).toBe(
            String(searchMaxLength ?? 200),
        )
    },
)

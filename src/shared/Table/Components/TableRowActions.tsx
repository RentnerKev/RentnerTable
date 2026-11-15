'use client'

import { Menu } from '@rentnerkev/menu/menu'
import { Ellipsis } from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import type { TableRowActionsProps } from '../Types/dataTable.types.ts'

export function TableRowActions({
    label,
    items,
    disabled,
}: TableRowActionsProps) {
    return (
        <Menu
            ariaLabel={label}
            items={items}
            disabled={disabled}
            controlSize="sm"
            align="end"
            asChild
            trigger={
                <TableButton
                    iconOnly
                    className="border-transparent bg-transparent"
                >
                    <Ellipsis aria-hidden="true" className="size-4" />
                </TableButton>
            }
        />
    )
}

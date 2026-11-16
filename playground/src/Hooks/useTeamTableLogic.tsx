import { useMemo, useState } from 'react'
import { Menu } from '@rentnerkev/menu'
import { ChevronDown, Eye, MousePointer2, Plus, UserCheck } from 'lucide-react'
import { createTableColumnHelper, TableRowActions } from '../../../src/index.ts'
import type { TableLocale, TableRow } from '../../../src/index.ts'
import { playgroundMessages } from '../config/playground.config.ts'
import type {
    Member,
    TeamTableLogicResult,
    TeamTableProps,
} from '../Types/playground.types.ts'

const column = createTableColumnHelper<Member>()

export function useTeamTableLogic(
    locale: TableLocale,
    onActivateMembers: TeamTableProps['onActivateMembers'],
    onStatusChange: TeamTableProps['onStatusChange'],
    onAddMember: TeamTableProps['onAddMember'],
    isLoading: boolean,
): TeamTableLogicResult {
    const messages = playgroundMessages[locale]
    const [target, setTarget] = useState<HTMLDivElement | null>(null)
    const [contextRow, setContextRow] = useState<TableRow<Member> | null>(null)
    const [lastRowEvent, setLastRowEvent] = useState('')
    const columns = useMemo(
        () =>
            column.columns([
                column.accessor('name', {
                    header: messages.member,
                    enableHiding: false,
                    meta: { filter: { type: 'text' } },
                    cell: ({ row }) => (
                        <div className="flex items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-rentner-accent/15 bg-rentner-accent/10 font-semibold text-rentner-accent"
                            >
                                {row.original.name.slice(0, 1)}
                            </span>
                            <div className="whitespace-nowrap">
                                <p className="font-medium">
                                    {row.original.name}
                                </p>
                                <p className="mt-1 text-xs text-rentner-muted">
                                    {row.original.email}
                                </p>
                            </div>
                        </div>
                    ),
                }),
                column.accessor('role', {
                    header: messages.role,
                    meta: {
                        filter: {
                            type: 'select',
                            options: [
                                { value: 'Maintainer', label: 'Maintainer' },
                                { value: 'Developer', label: 'Developer' },
                                { value: 'Designer', label: 'Designer' },
                            ],
                        },
                    },
                    cell: ({ getValue }) => (
                        <span className="inline-flex items-center rounded-md border border-rentner-border bg-rentner-control/50 px-2.5 py-1 text-xs font-medium">
                            {getValue()}
                        </span>
                    ),
                }),
                column.accessor('projects', {
                    header: messages.projects,
                    enableColumnFilter: false,
                    meta: { align: 'right' },
                    cell: ({ getValue }) => (
                        <span className="font-mono text-xs tabular-nums">
                            {String(getValue()).padStart(2, '0')}
                        </span>
                    ),
                }),
                column.accessor(
                    (member) => (member.active ? 'active' : 'inactive'),
                    {
                        id: 'status',
                        header: messages.status,
                        meta: {
                            filter: {
                                type: 'select',
                                options: [
                                    { value: 'active', label: messages.active },
                                    {
                                        value: 'inactive',
                                        label: messages.inactive,
                                    },
                                ],
                            },
                        },
                        cell: ({ row }) => (
                            <Menu
                                asChild
                                disabled={isLoading}
                                ariaLabel={`${messages.changeStatus}: ${row.original.name} — ${row.original.active ? messages.active : messages.inactive}`}
                                items={[
                                    {
                                        id: 'active',
                                        type: 'radio',
                                        name: 'status',
                                        label: messages.active,
                                        checked: row.original.active,
                                        closeOnSelect: true,
                                        onCheckedChange: () =>
                                            onStatusChange(row.id, true),
                                    },
                                    {
                                        id: 'inactive',
                                        type: 'radio',
                                        name: 'status',
                                        label: messages.inactive,
                                        checked: !row.original.active,
                                        closeOnSelect: true,
                                        onCheckedChange: () =>
                                            onStatusChange(row.id, false),
                                    },
                                ]}
                                trigger={
                                    <button
                                        type="button"
                                        className={
                                            row.original.active
                                                ? 'inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-rentner-success/10 px-2.5 py-1 text-xs font-medium text-rentner-success outline-rentner-accent hover:ring-1 hover:ring-current'
                                                : 'inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-rentner-control px-2.5 py-1 text-xs font-medium text-rentner-muted outline-rentner-accent hover:ring-1 hover:ring-current'
                                        }
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="size-1.5 rounded-full bg-current"
                                        />
                                        <span className="min-w-0 truncate">
                                            {row.original.active
                                                ? messages.active
                                                : messages.inactive}
                                        </span>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className="size-3"
                                        />
                                    </button>
                                }
                            />
                        ),
                    },
                ),
                column.accessor('createdAt', {
                    header: messages.created,
                    meta: { filter: { type: 'dateRange' } },
                    cell: ({ getValue }) => (
                        <span className="whitespace-nowrap text-xs text-rentner-muted">
                            {new Intl.DateTimeFormat(locale, {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            }).format(new Date(getValue()))}
                        </span>
                    ),
                }),
                column.display({
                    id: 'actions',
                    header: messages.actions,
                    enableSorting: false,
                    enableColumnFilter: false,
                    enableGlobalFilter: false,
                    enableHiding: false,
                    meta: { align: 'right' },
                    cell: ({ row }) => (
                        <TableRowActions
                            label={`${messages.actions}: ${row.original.name}`}
                            items={[
                                {
                                    id: 'details',
                                    label: messages.details,
                                    icon: <Eye className="size-4" />,
                                    onSelect: () => row.toggleExpanded(),
                                },
                                {
                                    id: 'select',
                                    label: messages.select,
                                    icon: <MousePointer2 className="size-4" />,
                                    onSelect: () => row.toggleSelected(),
                                },
                            ]}
                        />
                    ),
                }),
            ]),
        [locale, messages, onStatusChange, isLoading],
    )
    return {
        state: {
            columns,
            caption: messages.caption,
            portalContainer: target,
            lastRowEvent,
            contextItems: contextRow
                ? [
                      {
                          id: 'member',
                          type: 'label',
                          label: contextRow.original.name,
                      },
                      {
                          id: 'details',
                          disabled: isLoading,
                          label: messages.details,
                          icon: <Eye className="size-4" />,
                          onSelect: () => contextRow.toggleExpanded(),
                      },
                      {
                          id: 'select',
                          disabled: isLoading,
                          label: messages.select,
                          icon: <MousePointer2 className="size-4" />,
                          onSelect: () => contextRow.toggleSelected(),
                      },
                      { id: 'separator', type: 'separator' },
                      {
                          id: 'active',
                          label: messages.active,
                          disabled: isLoading,
                          onSelect: () => onStatusChange(contextRow.id, true),
                      },
                      {
                          id: 'inactive',
                          label: messages.inactive,
                          disabled: isLoading,
                          onSelect: () => onStatusChange(contextRow.id, false),
                      },
                  ]
                : [
                      {
                          id: 'add',
                          disabled: isLoading,
                          label: messages.add,
                          icon: <Plus className="size-4" />,
                          onSelect: onAddMember,
                      },
                  ],
            bulkActions: (context) => (
                <button
                    type="button"
                    onClick={() => onActivateMembers(context)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rentner-accent/20 px-3 py-2 text-xs font-medium text-rentner-accent"
                >
                    <UserCheck aria-hidden="true" className="size-4" />
                    {messages.activate}
                </button>
            ),
            renderExpandedRow: (row) => (
                <div className="grid gap-4 text-sm sm:grid-cols-3">
                    <div>
                        <p className="mb-1 text-xs text-rentner-muted">
                            {messages.detailsTitle}
                        </p>
                        <p className="font-medium">{row.original.name}</p>
                        <p className="mt-1 text-rentner-muted">
                            {row.original.email}
                        </p>
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-rentner-muted">
                            {messages.account}
                        </p>
                        <p>{row.original.id}</p>
                    </div>
                    <div>
                        <p className="mb-1 text-xs text-rentner-muted">
                            {messages.projects}
                        </p>
                        <p>{row.original.projects}</p>
                    </div>
                </div>
            ),
        },
        refs: { target: setTarget },
        handler: {
            handleRowClick: (row) => {
                setContextRow(row)
                setLastRowEvent(`${messages.clicked}: ${row.original.name}`)
            },
            handleRowDoubleClick: (row) => {
                setContextRow(row)
                setLastRowEvent(
                    messages.doubleClicked + ': ' + row.original.name,
                )
            },
            handleRowContextMenu: (row) => {
                setContextRow(row)
                setLastRowEvent(
                    `${messages.rightClicked}: ${row.original.name}`,
                )
            },
            handleTableContextMenu: (event) => {
                if (
                    event.target instanceof Element &&
                    !event.target.closest('tr[data-row-id]')
                )
                    setContextRow(null)
            },
        },
    }
}

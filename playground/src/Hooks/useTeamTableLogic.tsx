import { useMemo } from 'react'
import { Eye, MousePointer2, UserCheck } from 'lucide-react'
import { createTableColumnHelper, TableRowActions } from '../../../src/index.ts'
import type { TableLocale } from '../../../src/index.ts'
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
): TeamTableLogicResult {
    const messages = playgroundMessages[locale]
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
                            <span
                                className={
                                    row.original.active
                                        ? 'inline-flex items-center gap-1.5 rounded-full bg-rentner-success/10 px-2.5 py-1 text-xs font-medium text-rentner-success'
                                        : 'inline-flex items-center gap-1.5 rounded-full bg-rentner-control px-2.5 py-1 text-xs font-medium text-rentner-muted'
                                }
                            >
                                <span
                                    aria-hidden="true"
                                    className="size-1.5 rounded-full bg-current"
                                />
                                {row.original.active
                                    ? messages.active
                                    : messages.inactive}
                            </span>
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
        [locale, messages],
    )
    return {
        state: {
            columns,
            caption: messages.caption,
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
    }
}

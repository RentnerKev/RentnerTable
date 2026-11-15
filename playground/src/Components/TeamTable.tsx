import { Plus, UsersRound } from 'lucide-react'
import { DataTable } from '../../../src/index.ts'
import { useTeamTableLogic } from '../Hooks/useTeamTableLogic.tsx'
import { playgroundMessages } from '../config/playground.config.ts'
import type { TeamTableProps } from '../Types/playground.types.ts'

export function TeamTable({
    data,
    locale,
    size,
    isLoading,
    striped,
    error,
    onRetry,
    onAddMember,
    onActivateMembers,
}: TeamTableProps) {
    const { state } = useTeamTableLogic(locale, onActivateMembers)
    return (
        <DataTable
            data={data}
            columns={state.columns}
            getRowId={(member) => member.id}
            getRowLabel={(member) => member.name}
            title={state.caption}
            description={playgroundMessages[locale].description}
            icon={<UsersRound className="size-5" />}
            locale={locale}
            size={size}
            isLoading={isLoading}
            striped={striped}
            selectable
            error={error ? playgroundMessages[locale].demoError : undefined}
            onRetry={onRetry}
            toolbarActions={
                <button
                    type="button"
                    onClick={onAddMember}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-rentner-accent px-3 text-xs font-semibold text-rentner-accent-foreground hover:bg-rentner-accent-hover"
                >
                    <Plus aria-hidden="true" className="size-4" />
                    {playgroundMessages[locale].add}
                </button>
            }
            bulkActions={state.bulkActions}
            renderExpandedRow={state.renderExpandedRow}
        />
    )
}

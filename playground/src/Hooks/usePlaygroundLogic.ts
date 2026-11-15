import { useEffect, useState } from 'react'
import type {
    DataTableContext,
    TableLocale,
    TableSize,
} from '../../../src/index.ts'
import { emptyMembers, members } from '../config/playground.config.ts'
import { createDemoMembers } from '../lib/demoData.ts'
import type {
    Member,
    PlaygroundLogicResult,
} from '../Types/playground.types.ts'

export function usePlaygroundLogic(): PlaygroundLogicResult {
    const [data, setData] = useState<Member[]>(() => createDemoMembers(members))
    const [isEmpty, setIsEmpty] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isLight, setIsLight] = useState(false)
    const [striped, setStriped] = useState(true)
    const [error, setError] = useState(false)
    const [locale, setLocale] = useState<TableLocale>('en')
    const [size, setSize] = useState<TableSize>('md')
    useEffect(() => {
        document.documentElement.lang = locale
    }, [locale])

    const handleAddMember = () =>
        setData((current) => [
            {
                id: `new-${current.length + 1}`,
                name: `New member ${current.length + 1}`,
                email: `new.${current.length + 1}@example.com`,
                role: 'Developer',
                projects: 0,
                active: true,
                createdAt: '2026-11-15',
            },
            ...current,
        ])
    const handleActivateMembers = ({
        selectedRows,
        table,
    }: DataTableContext<Member>) => {
        const ids = new Set(selectedRows.map((row) => row.id))
        setData((current) =>
            current.map((member) =>
                ids.has(member.id) ? { ...member, active: true } : member,
            ),
        )
        table.resetRowSelection(true)
    }
    return {
        state: {
            data: isEmpty ? emptyMembers : data,
            locale,
            size,
            isEmpty,
            isLoading,
            isLight,
            striped,
            error,
        },
        handler: {
            handleToggleEmpty: () => setIsEmpty((current) => !current),
            handleToggleLoading: () => setIsLoading((current) => !current),
            handleToggleTheme: () => setIsLight((current) => !current),
            handleToggleStriped: () => setStriped((current) => !current),
            handleToggleError: () => setError((current) => !current),
            handleRetry: () => setError(false),
            handleToggleLocale: () =>
                setLocale((current) => (current === 'en' ? 'de' : 'en')),
            handleSizeChange: setSize,
            handleAddMember,
            handleActivateMembers,
        },
    }
}

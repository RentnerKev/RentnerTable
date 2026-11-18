import { useId } from 'react'
import type { RowData } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Columns3, X } from 'lucide-react'
import { TableButton } from './TableButton.tsx'
import { useTableColumnSettingsLogic } from '../Hooks/useTableColumnSettingsLogic.ts'
import { useTableStyles } from '../Hooks/useTableStyles.ts'
import type { TableColumnSettingsProps } from '../Types/columnSettings.types.ts'

export function TableColumnSettings<TData extends RowData>(
    props: TableColumnSettingsProps<TData>,
) {
    const {
        state,
        handler,
        refs: { dialog, trigger },
    } = useTableColumnSettingsLogic(props)
    const { state: styles } = useTableStyles()
    const id = useId()
    return (
        <>
            <TableButton
                ref={trigger}
                slot="columnVisibilityButton"
                onClick={handler.handleOpen}
                disabled={state.unavailable}
                aria-haspopup="dialog"
                aria-expanded={state.open}
                aria-controls={`${id}-dialog`}
            >
                <Columns3 aria-hidden="true" className="size-4" />
                {state.messages.title}
            </TableButton>
            <dialog
                ref={dialog}
                id={`${id}-dialog`}
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-description`}
                onCancel={(event) => {
                    event.preventDefault()
                    handler.handleCancel()
                }}
                onClose={(event) => {
                    if (!event.currentTarget.open) handler.handleCancel()
                }}
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter' &&
                        event.target instanceof HTMLInputElement
                    )
                        event.preventDefault()
                }}
                className={`m-auto w-[min(44rem,calc(100%-2rem))] max-w-none max-h-[calc(100dvh-2rem)] overflow-auto rounded-rentner-control border border-rentner-border bg-rentner-surface p-0 text-rentner-foreground shadow-2xl backdrop:bg-black/50 ${styles.classNames.columnSettings ?? ''} ${props.className ?? ''}`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-rentner-border p-5">
                    <div>
                        <h2
                            id={`${id}-title`}
                            className="text-lg font-semibold"
                        >
                            {state.messages.title}
                        </h2>
                        <p
                            id={`${id}-description`}
                            className="mt-2 text-sm text-rentner-muted"
                        >
                            {state.messages.description}
                        </p>
                    </div>
                    <TableButton
                        iconOnly
                        aria-label={state.messages.close}
                        onClick={handler.handleCancel}
                    >
                        <X aria-hidden="true" className="size-4" />
                    </TableButton>
                </div>
                <ol className="space-y-2 p-5">
                    {state.rows.map((row, index) => (
                        <li
                            key={row.id}
                            data-table-column-setting={row.id}
                            className="flex flex-wrap items-center gap-3 rounded-lg border border-rentner-border p-3"
                        >
                            <label className="flex min-w-36 flex-1 items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={row.visible}
                                    disabled={
                                        state.saving ||
                                        state.unavailable ||
                                        !row.canHide ||
                                        (row.visible &&
                                            state.rows.filter(
                                                (item) => item.visible,
                                            ).length === 1)
                                    }
                                    onChange={(event) =>
                                        handler.handleVisibility(
                                            row.id,
                                            event.target.checked,
                                        )
                                    }
                                    aria-label={`${state.messages.visible}: ${row.label}`}
                                    className="size-4 accent-rentner-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rentner-accent"
                                />
                                {row.label}
                            </label>
                            <label className="flex items-center gap-2 text-xs text-rentner-muted">
                                <span>{state.messages.width}</span>
                                <input
                                    type="number"
                                    value={
                                        Number.isFinite(row.width)
                                            ? Math.round(row.width)
                                            : ''
                                    }
                                    min={row.min}
                                    max={row.max}
                                    step="1"
                                    aria-label={`${state.messages.width}: ${row.label}`}
                                    aria-invalid={
                                        (row.canResize &&
                                            (!Number.isFinite(row.width) ||
                                                row.width < row.min ||
                                                row.width > row.max)) ||
                                        undefined
                                    }
                                    disabled={
                                        state.saving ||
                                        state.unavailable ||
                                        !row.canResize
                                    }
                                    onChange={(event) =>
                                        handler.handleWidth(
                                            row.id,
                                            event.target.value,
                                        )
                                    }
                                    className="h-9 w-24 rounded-md border border-rentner-border bg-rentner-control px-2 text-rentner-foreground focus-visible:outline-2 focus-visible:outline-rentner-accent disabled:opacity-40"
                                />
                            </label>
                            <div className="flex gap-1">
                                <TableButton
                                    iconOnly
                                    aria-label={state.messages.moveUp(
                                        row.label,
                                    )}
                                    disabled={
                                        index === 0 ||
                                        state.saving ||
                                        state.unavailable
                                    }
                                    onClick={() =>
                                        handler.handleMove(row.id, -1)
                                    }
                                >
                                    <ArrowUp
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </TableButton>
                                <TableButton
                                    iconOnly
                                    aria-label={state.messages.moveDown(
                                        row.label,
                                    )}
                                    disabled={
                                        index === state.rows.length - 1 ||
                                        state.saving ||
                                        state.unavailable
                                    }
                                    onClick={() =>
                                        handler.handleMove(row.id, 1)
                                    }
                                >
                                    <ArrowDown
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                </TableButton>
                            </div>
                        </li>
                    ))}
                </ol>
                {state.error === 'save' ? (
                    <p
                        role="alert"
                        className="px-5 pb-4 text-sm text-rentner-error"
                    >
                        {state.messages.saveError}
                    </p>
                ) : state.storageError || state.error === 'reload' ? (
                    <div className="flex items-center gap-3 px-5 pb-4">
                        <p role="alert" className="text-sm text-rentner-error">
                            {state.messages.storageError}
                        </p>
                        {props.onReload && (
                            <TableButton
                                onClick={handler.handleRetry}
                                disabled={state.saving}
                            >
                                {state.messages.retry}
                            </TableButton>
                        )}
                    </div>
                ) : null}
                {!state.valid && state.rows.length > 0 && (
                    <p
                        role="alert"
                        className="px-5 pb-4 text-sm text-rentner-error"
                    >
                        {state.messages.invalidWidth}
                    </p>
                )}
                {props.persistenceStatus === 'loading' && (
                    <output className="block px-5 pb-4 text-sm">
                        {state.messages.loading}
                    </output>
                )}
                <div className="flex flex-wrap justify-end gap-2 border-t border-rentner-border p-5">
                    <TableButton
                        className="mr-auto"
                        onClick={handler.handleReset}
                        disabled={state.saving || state.unavailable}
                    >
                        {state.messages.reset}
                    </TableButton>
                    <TableButton onClick={handler.handleCancel}>
                        {state.saving
                            ? state.messages.close
                            : state.messages.cancel}
                    </TableButton>
                    <TableButton
                        onClick={handler.handleApply}
                        disabled={
                            !state.valid || state.saving || state.unavailable
                        }
                        aria-busy={state.saving || undefined}
                    >
                        {state.saving
                            ? state.messages.saving
                            : state.messages.apply}
                    </TableButton>
                </div>
            </dialog>
        </>
    )
}

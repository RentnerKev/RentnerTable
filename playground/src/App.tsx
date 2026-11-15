import { Table2, Braces, Layers3, ArrowUpRight } from 'lucide-react'
import { TeamTable } from './Components/TeamTable.tsx'
import { usePlaygroundLogic } from './Hooks/usePlaygroundLogic.ts'
import { playgroundMessages } from './config/playground.config.ts'

export function App() {
    const { state, handler } = usePlaygroundLogic()
    return (
        <main
            className={`min-h-screen bg-background-dark px-5 pb-12 text-rentner-foreground sm:px-10 ${state.isLight ? 'light-theme' : ''}`}
        >
            <div className="mx-auto max-w-7xl">
                <header className="flex items-center justify-between gap-4 border-b border-rentner-border py-6">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl border border-rentner-accent/20 bg-rentner-accent/10 text-rentner-accent">
                            <Table2 aria-hidden="true" className="size-5" />
                        </span>
                        <span className="font-mono text-xs text-rentner-muted">
                            @rentnerkev{' '}
                            <span className="px-1 opacity-50">/</span>{' '}
                            <span className="font-semibold text-rentner-foreground">
                                table
                            </span>
                        </span>
                    </div>
                    <a
                        href="https://github.com/RentnerKev/RentnerTable"
                        className="inline-flex items-center gap-1.5 text-xs text-rentner-muted hover:text-rentner-accent"
                    >
                        GitHub
                        <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </a>
                </header>
                <div className="flex flex-wrap items-end justify-between gap-6 py-10 sm:py-12">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-rentner-accent uppercase">
                            RentnerTable
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            {playgroundMessages[state.locale].subtitle}
                        </h1>
                        <p className="mt-4 text-sm leading-6 text-rentner-muted">
                            {playgroundMessages[state.locale].intro}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="inline-flex items-center gap-2 rounded-lg border border-rentner-border bg-rentner-surface px-3 py-2 text-xs text-rentner-muted">
                            <Braces
                                aria-hidden="true"
                                className="size-3.5 text-rentner-accent"
                            />
                            TypeScript
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-lg border border-rentner-border bg-rentner-surface px-3 py-2 text-xs text-rentner-muted">
                            <Layers3
                                aria-hidden="true"
                                className="size-3.5 text-rentner-accent"
                            />
                            TanStack v9
                        </span>
                    </div>
                </div>
                <section
                    data-playground-controls=""
                    aria-label={playgroundMessages[state.locale].controls}
                    className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-rentner-border bg-rentner-surface/50 p-2"
                >
                    <span className="px-3 font-mono text-[10px] tracking-widest text-rentner-muted uppercase">
                        Playground
                    </span>
                    <button
                        type="button"
                        aria-pressed={state.isEmpty}
                        onClick={handler.handleToggleEmpty}
                    >
                        {playgroundMessages[state.locale].empty}
                    </button>
                    <button
                        type="button"
                        aria-pressed={state.isLoading}
                        onClick={handler.handleToggleLoading}
                    >
                        {playgroundMessages[state.locale].loading}
                    </button>
                    <button
                        type="button"
                        aria-pressed={state.error}
                        onClick={handler.handleToggleError}
                    >
                        {playgroundMessages[state.locale].error}
                    </button>
                    <button
                        type="button"
                        aria-pressed={state.striped}
                        onClick={handler.handleToggleStriped}
                    >
                        {playgroundMessages[state.locale].striped}
                    </button>
                    <button
                        type="button"
                        aria-pressed={state.isLight}
                        onClick={handler.handleToggleTheme}
                    >
                        {playgroundMessages[state.locale].theme}
                    </button>
                    <button type="button" onClick={handler.handleToggleLocale}>
                        {playgroundMessages[state.locale].language}
                    </button>
                    <fieldset className="flex gap-1 rounded-lg border border-rentner-border p-1 sm:ml-auto">
                        <legend className="sr-only">
                            {playgroundMessages[state.locale].density}
                        </legend>
                        <button
                            type="button"
                            aria-label={playgroundMessages[state.locale].small}
                            aria-pressed={state.size === 'sm'}
                            onClick={() => handler.handleSizeChange('sm')}
                        >
                            S
                        </button>
                        <button
                            type="button"
                            aria-label={playgroundMessages[state.locale].medium}
                            aria-pressed={state.size === 'md'}
                            onClick={() => handler.handleSizeChange('md')}
                        >
                            M
                        </button>
                        <button
                            type="button"
                            aria-label={playgroundMessages[state.locale].large}
                            aria-pressed={state.size === 'lg'}
                            onClick={() => handler.handleSizeChange('lg')}
                        >
                            L
                        </button>
                    </fieldset>
                </section>
                <TeamTable
                    data={state.data}
                    locale={state.locale}
                    size={state.size}
                    isLoading={state.isLoading}
                    striped={state.striped}
                    error={state.error}
                    onRetry={handler.handleRetry}
                    onAddMember={handler.handleAddMember}
                    onActivateMembers={handler.handleActivateMembers}
                />
                <footer className="mt-5 flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-rentner-muted">
                    <p>{playgroundMessages[state.locale].hint}</p>
                    <span className="inline-flex shrink-0 items-center gap-2">
                        <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-rentner-accent"
                        />
                        {playgroundMessages[state.locale].demo} · v0.1.0
                    </span>
                </footer>
            </div>
        </main>
    )
}

import type {
    TableLocale,
    TableLocaleOption,
    TableMessages,
} from '../../shared/Table/Types/table.types.ts'

type TableMessageCatalog = Omit<TableMessages, 'rowRange'> & {
    rowRange: (
        first: number,
        last: number,
        total: number | null,
        rowLabel?: string,
    ) => string
}

const messages: Record<TableLocale, TableMessageCatalog> = {
    de: {
        resizeColumn: (label) => `Breite von ${label} ändern`,
        resetColumnSize: (label) => `Breite von ${label} zurücksetzen`,
        moveRows: 'Zeilen verschieben',
        moveRow: (label) => `${label} verschieben`,
        rowSortingActive: 'Sortierung aufheben, um Zeilen zu verschieben.',
        dragInstructions:
            'Leertaste zum Aufnehmen, Pfeiltasten zum Verschieben, Leertaste oder Enter zum Ablegen, Escape zum Abbrechen.',
        dragStart: (label) => `${label} aufgenommen.`,
        dragOver: (label, position, total) =>
            `${label}: Position ${position} von ${total}.`,
        dragEnd: (label, position, total) =>
            `${label} auf Position ${position} von ${total} abgelegt.`,
        dragCancel: (label) => `Verschieben von ${label} abgebrochen.`,
        empty: 'Keine Einträge vorhanden.',
        loading: 'Einträge werden geladen …',
        sortAscending: 'Aufsteigend sortieren',
        sortDescending: 'Absteigend sortieren',
        clearSorting: 'Sortierung aufheben',
        title: 'Datentabelle',
        search: 'Tabelle durchsuchen',
        searchPlaceholder: 'Einträge durchsuchen …',
        filters: 'Filter',
        columns: 'Spalten',
        resetFilters: 'Filter zurücksetzen',
        noResults: 'Keine Ergebnisse gefunden',
        noResultsFor: (summary) => `Keine Ergebnisse gefunden für ${summary}`,
        noResultsDescription: 'Passe deine Suche oder Filter an.',
        emptyDescription: 'Sobald Daten vorhanden sind, erscheinen sie hier.',
        error: 'Die Einträge konnten nicht geladen werden.',
        retry: 'Erneut versuchen',
        all: 'Alle',
        anyDate: 'Beliebiges Datum',
        filterColumn: (label) => `${label} filtern`,
        rowsPerPage: 'Zeilen pro Seite',
        firstPage: 'Erste Seite',
        previousPage: 'Vorherige Seite',
        nextPage: 'Nächste Seite',
        lastPage: 'Letzte Seite',
        pageInfo: (page, pages) =>
            pages === null ? `Seite ${page}` : `Seite ${page} von ${pages}`,
        rowRange: (first, last, total, rowLabel) =>
            total === null
                ? `${first}–${last} ${rowLabel ?? 'Einträge'}`
                : `${first}–${last} von ${total} ${rowLabel ?? 'Einträgen'}`,
        results: (count) => `${count} Einträge`,
        selected: (count) => `${count} ausgewählt`,
        clearSelection: 'Auswahl aufheben',
        selectPage: 'Alle Zeilen auf dieser Seite auswählen',
        selectRow: (label) => `${label} auswählen`,
        expandRow: (label) => `Details für ${label} öffnen`,
        collapseRow: (label) => `Details für ${label} schließen`,
    },
    en: {
        resizeColumn: (label) => `Resize ${label}`,
        resetColumnSize: (label) => `Reset width of ${label}`,
        moveRows: 'Reorder rows',
        moveRow: (label) => `Move ${label}`,
        rowSortingActive: 'Clear sorting to reorder rows.',
        dragInstructions:
            'Press Space to pick up a row, arrow keys to move, Space or Enter to drop, and Escape to cancel.',
        dragStart: (label) => `Picked up ${label}.`,
        dragOver: (label, position, total) =>
            `${label}: position ${position} of ${total}.`,
        dragEnd: (label, position, total) =>
            `Dropped ${label} at position ${position} of ${total}.`,
        dragCancel: (label) => `Cancelled moving ${label}.`,
        empty: 'No entries found.',
        loading: 'Loading entries …',
        sortAscending: 'Sort ascending',
        sortDescending: 'Sort descending',
        clearSorting: 'Clear sorting',
        title: 'Data table',
        search: 'Search table',
        searchPlaceholder: 'Search entries …',
        filters: 'Filters',
        columns: 'Columns',
        resetFilters: 'Reset filters',
        noResults: 'No results found',
        noResultsFor: (summary) => `No results found for ${summary}`,
        noResultsDescription: 'Try another search or adjust your filters.',
        emptyDescription:
            'Your entries will appear here when data is available.',
        error: 'Entries could not be loaded.',
        retry: 'Try again',
        all: 'All',
        anyDate: 'Any date',
        filterColumn: (label) => `Filter ${label}`,
        rowsPerPage: 'Rows per page',
        firstPage: 'First page',
        previousPage: 'Previous page',
        nextPage: 'Next page',
        lastPage: 'Last page',
        pageInfo: (page, pages) =>
            pages === null ? `Page ${page}` : `Page ${page} of ${pages}`,
        rowRange: (first, last, total, rowLabel = 'entries') =>
            total === null
                ? `${first}–${last} ${rowLabel}`
                : `${first}–${last} of ${total} ${rowLabel}`,
        results: (count) => `${count} entries`,
        selected: (count) => `${count} selected`,
        clearSelection: 'Clear selection',
        selectPage: 'Select all rows on this page',
        selectRow: (label) => `Select ${label}`,
        expandRow: (label) => `Expand details for ${label}`,
        collapseRow: (label) => `Collapse details for ${label}`,
    },
}

export function getTableMessages(locale: TableLocale = 'en'): TableMessages {
    return { ...messages[locale] }
}

export function getTableLocale(locale: TableLocaleOption = 'en'): TableLocale {
    return typeof locale === 'string' ? locale : locale.code
}

function definedMessages<T extends object>(overrides?: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(overrides ?? {}).filter(
            ([, value]) => value !== undefined,
        ),
    ) as Partial<T>
}

export function resolveTableMessages(
    locale?: TableLocaleOption,
    overrides?: Partial<TableMessages>,
    rowLabel?: string,
): TableMessages {
    const code = getTableLocale(locale)
    const localeMessages =
        typeof locale === 'object' ? locale.messages : undefined
    const customMessages = {
        ...definedMessages(localeMessages),
        ...definedMessages(overrides),
    }
    const resolved = { ...getTableMessages(code), ...customMessages }
    if (localeMessages?.columnSettings || overrides?.columnSettings) {
        resolved.columnSettings = {
            ...definedMessages(localeMessages?.columnSettings),
            ...definedMessages(overrides?.columnSettings),
        }
    }
    if (localeMessages?.calendar || overrides?.calendar) {
        resolved.calendar = {
            ...definedMessages(localeMessages?.calendar),
            ...definedMessages(overrides?.calendar),
        }
    }
    if (customMessages.rowRange === undefined && rowLabel !== undefined) {
        resolved.rowRange = (first, last, total) =>
            messages[code].rowRange(first, last, total, rowLabel)
    }
    if (
        customMessages.noResults !== undefined &&
        customMessages.noResultsFor === undefined
    ) {
        const title = customMessages.noResults
        resolved.noResultsFor = (summary) => `${title} — ${summary}`
    }
    return resolved
}

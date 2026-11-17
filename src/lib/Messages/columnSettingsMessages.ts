import type { TableColumnSettingsMessages } from '../../shared/Table/Types/columnSettings.types.ts'
import type { TableLocale } from '../../shared/Table/Types/table.types.ts'

export const columnSettingsMessages: Record<
    TableLocale,
    TableColumnSettingsMessages
> = {
    en: {
        title: 'Column settings',
        description:
            'Arrange columns, choose visible fields and adjust widths. Changes apply together when confirmed.',
        visible: 'Visible',
        width: 'Width in pixels',
        moveUp: (label) => `Move ${label} earlier`,
        moveDown: (label) => `Move ${label} later`,
        reset: 'Reset layout',
        apply: 'Apply layout',
        cancel: 'Cancel',
        close: 'Close',
        saving: 'Saving layout…',
        loading: 'Loading saved layout…',
        retry: 'Retry',
        storageError: 'Saved preferences could not be loaded or saved.',
        saveError:
            'The layout was applied, but could not be saved. Retry applying it to save again.',
        invalidWidth: 'Enter a valid width within each column’s limits.',
    },
    de: {
        title: 'Spalteneinstellungen',
        description:
            'Ordne Spalten, wähle sichtbare Felder und passe Breiten an. Änderungen werden gemeinsam beim Bestätigen übernommen.',
        visible: 'Sichtbar',
        width: 'Breite in Pixeln',
        moveUp: (label) => `${label} nach vorn verschieben`,
        moveDown: (label) => `${label} nach hinten verschieben`,
        reset: 'Layout zurücksetzen',
        apply: 'Layout übernehmen',
        cancel: 'Abbrechen',
        close: 'Schließen',
        saving: 'Layout wird gespeichert…',
        loading: 'Gespeichertes Layout wird geladen…',
        retry: 'Erneut versuchen',
        storageError:
            'Gespeicherte Einstellungen konnten nicht geladen oder gespeichert werden.',
        saveError:
            'Das Layout wurde übernommen, konnte aber nicht gespeichert werden. Übernimm es erneut, um das Speichern zu wiederholen.',
        invalidWidth:
            'Gib eine gültige Breite innerhalb der jeweiligen Spaltengrenzen ein.',
    },
}

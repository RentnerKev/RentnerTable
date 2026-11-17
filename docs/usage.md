# RentnerTable usage

Resizable tables use configured column widths for initial proportions and fill
available space across resizable columns. Mounting does not emit a sizing change
or persist inferred content widths. Explicit saved sizing remains authoritative.

Use `searchMaxLength` when an existing server search accepts more than the
default 200 characters. This also applies to `DataTableToolbar.options` in custom
compositions.

## Column order

Use stable column IDs and `tableOptions.state.columnOrder` with
`onColumnOrderChange` for application-controlled column ordering. The native
table instance also exposes `setColumnOrder` and `resetColumnOrder` when composing
with `useDataTableLogic` or using `toolbarActions`.

Include `columnOrder` in a persistence field allowlist to save and restore it.
Snapshots remain version 1 and older snapshots remain valid. On restoration,
obsolete IDs are ignored and newly added columns are appended. Invalid,
duplicate, empty and unsafe IDs are rejected during snapshot normalization.

The package supports React 19, React DOM 19, Tailwind CSS 4 and TanStack Table 9. Import `@rentnerkev/table/tailwind.css` after Tailwind; see the [README quick start](../README.md#quick-start) for a complete typed component.

## Components and entry points

| Entry                            | API                                                  |
| -------------------------------- | ---------------------------------------------------- |
| `@rentnerkev/table`              | Public components, hooks, helpers, filters and types |
| `@rentnerkev/table/table`        | `Table`, a minimal sortable table                    |
| `@rentnerkev/table/data-table`   | `DataTable`, the complete table interface            |
| `@rentnerkev/table/hooks`        | `useDataTableLogic`                                  |
| `@rentnerkev/table/filters`      | Portable text, equality and date-range filters       |
| `@rentnerkev/table/types`        | Type-only contracts                                  |
| `@rentnerkev/table/tailwind.css` | Theme, scanned library classes and control styles    |
| `@rentnerkev/table/theme.css`    | Shared theme token mapping only                      |

`DataTable` requires `data`, `columns` and `getRowId`. Supply a stable string ID from the record rather than a page-relative array index. `getRowLabel` gives selection and detail buttons a readable accessible name.

`Table` takes `data`, `columns`, an optional `getRowId` and a `caption`. It renders every supplied row and supports `enableSorting`, `initialSorting`, `locale`, `messages`, density, striped rows and loading/empty content. It accepts native table attributes and a ref.

## Resizing and row reordering

Both capabilities are opt-in. `resizableColumns` works with `Table` and `DataTable`; `reorderableRows` is provided by `DataTable`.

```tsx
import { useState } from 'react'
import { DataTable, createTableColumnHelper } from '@rentnerkev/table'

interface Member {
    id: string
    name: string
    role: string
}
const initialMembers: Member[] = [
    { id: 'alex', name: 'Alex Weber', role: 'Developer' },
    { id: 'sam', name: 'Sam Fischer', role: 'Designer' },
]
const column = createTableColumnHelper<Member>()
const columns = column.columns([
    column.accessor('name', { header: 'Member', minSize: 100, maxSize: 600 }),
    column.accessor('role', { header: 'Role', enableResizing: false }),
])

export default function ReusableTeam() {
    const [data, setData] = useState(initialMembers)
    return (
        <DataTable
            data={data}
            columns={columns}
            getRowId={(member) => member.id}
            getRowLabel={(member) => member.name}
            title="Project team"
            resizableColumns
            reorderableRows
            onRowOrderChange={(next) => setData(next)}
        />
    )
}
```

Resize a leaf column at its edge. Width stays within the available viewport: growing a column consumes free viewport space, then borrows only from following resizable columns until their minimum sizes or the configured maximum is reached. Earlier columns keep their widths and boundaries. Shrinking moves only the active edge and subsequent columns. The last column can grow only into unused viewport space. This follows rendered column order, including RTL layouts. Arrow keys change width by 10 pixels, Shift+Arrow by 50; Home or double-click resets its configured size, and End selects its available maximum. `minSize`, `maxSize` and `enableResizing` configure each column. When a viewport cannot contain the configured minima, rendered widths fit proportionally without replacing persisted size preferences. Native `tableOptions.columnResizeMode`, `columnResizeDirection`, controlled `state.columnSizing` and `onColumnSizingChange` remain available on `DataTable`.

Drag updates are coalesced to one update per animation frame and use the shared viewport measurement instead of reading layout for every move. The release position is applied immediately, including quick drags before the next frame. Touch cancellation, window blur, and unmount discard pending updates. Controlled sizing callbacks keep the same value/updater contract.

Drag a row by its handle, hold the handle briefly on touch devices, or use Space, arrow keys and Space/Enter to move it with the keyboard. Escape and drops outside the table cancel. The preview stays within the visible table width and includes expanded details. Clear sorting before reordering; dragging is disabled while sorting is active or the table is loading or showing an error.

`reorderableRows` alone keeps the order internally. Providing `onRowOrderChange(data, change)` makes the caller responsible for applying the returned array. `TableRowOrderChange` contains `activeId`, `overId`, `fromIndex` and `toIndex`; indices refer to the full supplied data, before filtering and pagination. Only rendered rows are drag targets. Keep stable record IDs, preserve the rest of the data when persisting server-page changes, and retain order in your backend when required. Selection and expanded details stay attached to their record during reordering. Drag dependencies load on demand.

## Remembering table preferences

Persistence is opt-in. Set `persistence="members:user-id"` for local browser storage, or supply an options object. Use a unique key per table and account; use React's `key` when changing the component's application identity. No complete data records, event handlers or transient drag state are stored.

```tsx
import { useRef } from 'react'
import { DataTable, createTableColumnHelper } from '@rentnerkev/table'
import type { TableStateController } from '@rentnerkev/table'

type Member = { id: string; name: string }
const column = createTableColumnHelper<Member>()
const columns = column.columns([column.accessor('name', { header: 'Member' })])

export function PersistentMembers({
    members,
    userId,
    isLoading,
}: {
    members: readonly Member[]
    userId: string
    isLoading: boolean
}) {
    const preferences = useRef<TableStateController>(null)
    return (
        <DataTable
            key={userId}
            data={members}
            columns={columns}
            getRowId={(member) => member.id}
            isLoading={isLoading}
            resizableColumns
            reorderableRows
            selectable
            stateRef={preferences}
            persistence={{ key: `members:${userId}`, storage: 'local' }}
        />
    )
}
```

Snapshots have `{ version: 1, state: { ... } }`. Supported fields are `sorting`, `columnFilters`, `globalFilter`, `columnVisibility`, `columnSizing`, `pagination`, `rowSelection`, `expanded`, `showFilters` and internal `rowOrder`. Set `fields` to an allowlist, for example `['sorting', 'columnSizing', 'columnVisibility']`. Use `storage: 'session'` for tab-session storage. Writes default to a 250 ms debounce; `debounceMs` changes the delay. Browser storage also flushes synchronously on `pagehide`.

Internal row order is a list of stable IDs and survives asynchronous data loading when `isLoading` is supplied. With `onRowOrderChange`, the application owns data order: persist the returned IDs/positions in the application backend and supply the ordered records when loading. `applyTableRowOrder(data, ids, getRowId)` applies an ID list to current records while retaining new records' insertion positions.

### Asynchronous database storage

Supply a `TableStateStorage` adapter. `load(key, signal)` returns a snapshot or `null`; `save(key, snapshot)` stores it; optional `remove(key)` clears it. For example, connect these methods to an authenticated application API:

```ts
import type { TableStateStorage } from '@rentnerkev/table'

const endpoint = (key: string) =>
    `/api/table-preferences/${encodeURIComponent(key)}`
export const preferencesStorage: TableStateStorage = {
    async load(key, signal) {
        const response = await fetch(endpoint(key), { signal })
        if (response.status === 404) return null
        if (!response.ok)
            throw new Error(`Loading preferences failed (${response.status})`)
        return response.json()
    },
    async save(key, snapshot) {
        const response = await fetch(endpoint(key), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot),
        })
        if (!response.ok)
            throw new Error(`Saving preferences failed (${response.status})`)
    },
    async remove(key) {
        const response = await fetch(endpoint(key), { method: 'DELETE' })
        if (!response.ok && response.status !== 404)
            throw new Error(`Clearing preferences failed (${response.status})`)
    },
}
```

Pass `persistence={{ key, storage: preferencesStorage, onError }}`. The table validates loaded snapshots, ignores obsolete columns, preserves fields edited while loading, aborts obsolete loads, and serializes writes so an older request cannot overwrite a later change. Failed loads leave the current UI usable and do not overwrite stored preferences with defaults. `onError(error, { operation, key })` reports failures; `onRestore(snapshot)` observes accepted state. Custom filter values must be JSON-compatible; unsupported values are omitted, and optional undefined object properties are omitted like `JSON.stringify`.

`stateRef` exposes `getState()`, `restoreState(snapshot)`, `flush()`, `clear()` and `reload()`. Exported snapshots are detached; restoring a partial snapshot uses native controlled-state callbacks. `clear()` removes stored preferences without resetting the current UI, and `reload()` retries loading. If an adapter has no `remove`, clearing saves an empty snapshot. Await `flush()` before application navigation when the backend must confirm a write; arbitrary asynchronous requests cannot be guaranteed to finish after a browser tab closes.

The headless hook exposes the same operations as `handler.handleGetState`, `handleRestoreState`, `handleFlushState`, `handleClearStoredState` and `handleReloadState`, plus `state.persistenceStatus` and `state.persistenceError`. Browser storage is accessed after mounting, so server rendering does not require `window`.

## Row, cell and table events

`Table` and `DataTable` provide `onRowClick`, `onRowDoubleClick`, `onRowContextMenu`, `onCellClick`, `onCellDoubleClick` and `onCellContextMenu`. Callbacks receive the native typed row/cell followed by the React mouse event. Use `row.original`, `cell.row.original` and `cell.column.id` to route application actions.

Row click and double-click notifications ignore interactive controls, prevented events and descendants marked `data-no-row-click`. Cell handlers can call `preventDefault()` to suppress the row callback, or `stopPropagation()` to stop bubbling. Render editable cells as accessible buttons or shared RentnerKev controls; those controls keep their own keyboard behavior.

For context menus, either prevent the browser menu and open your own UI, or wrap the table with `ContextMenu` from `@rentnerkev/menu` and let the event bubble to that wrapper. Set the target row in `onRowContextMenu` before the wrapper opens. Native table events, attributes and refs go through `DataTable.tableProps`; `Table` accepts them directly. When using headless composition, pass `handler.handleRowReorder` to `TableSurface.onRowReorder` together with `reorderableRows`.

## Columns and filters

Create columns with `createTableColumnHelper<YourRecord>()`. `helper.columns([...])` preserves typed values across heterogeneous accessor columns. Define reusable columns outside render, or memoize columns that depend on locale or callbacks.

| Column setting                                | Behavior                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `meta.label`                                  | Plain-text label for filter and visibility controls when the header is custom JSX |
| `meta.align`                                  | `left`, `center` or `right` alignment for headers and cells                       |
| `meta.headerClassName`, `meta.cellClassName`  | Extra classes for that column                                                     |
| `meta.filter: { type: 'text' }`               | Trimmed, case-insensitive substring matching                                      |
| `meta.filter: { type: 'select', options }`    | Exact scalar value matching; options use string values                            |
| `meta.filter: { type: 'dateRange' }`          | Inclusive local calendar-day boundaries                                           |
| `meta.filter: { type: 'custom', render }`     | Render a custom control with `value`, `onValueChange` and `label`                 |
| `enableColumnFilter: false`                   | Disable the column filter                                                         |
| `enableGlobalFilter: false`                   | Exclude a column from global search                                               |
| `enableSorting: false`, `enableHiding: false` | Disable individual capabilities                                                   |

An explicit TanStack `filterFn` takes precedence over the default function selected by metadata. A custom filter control should supply a matching `filterFn` when text matching is unsuitable.

`TableDateRange` is `{ from?: string; to?: string }`, using `YYYY-MM-DD` boundaries. Rows may contain valid `Date` objects, timestamps or date strings. Date-only strings are interpreted as local dates. Invalid dates and reversed ranges produce no matches. Search, sorting and column-filter changes return to page one by default; `tableOptions.autoResetPageIndex: false` opts out. Client pages still clamp when the current page no longer exists.

## Selection, actions and expanded rows

Set `selectable` to `true` or a predicate receiving the native row. The header checkbox selects eligible rows on the current page. Selection uses record IDs and survives page changes; `bulkActions` receives the currently filtered selected rows and the native table instance. With manual server pagination it can only resolve selected records in the data currently supplied by the application. Keep a separate application-level ID selection when actions must span unloaded server pages.

`toolbarActions` accepts a node or a function receiving `{ table, selectedRows }`. `bulkActions` receives the same context. Use `table.resetRowSelection(true)` after a successful bulk operation when the selection should clear. Disabling `selectable` hides selection UI while preserving native selection state.

`TableRowActions` accepts an accessible `label` and the existing RentnerMenu item model. Place it in a display column; item callbacks can act on that column's row. See the [playground implementation](../playground/src/Hooks/useTeamTableLogic.tsx) for row menus and a bulk update.

`renderExpandedRow(row)` renders content in a separate full-width table row. Use `row.original` for the record. Keep data requests and mutations in application hooks; the table does not fetch or persist records.

## Controlled server data

Pass controlled TanStack state and callbacks through `tableOptions`. Set `manualPagination`, `manualFiltering` and `manualSorting` to make the server responsible for those operations. The application supplies the current page's records and a total `rowCount` when known.

```tsx
import { useState } from 'react'
import { useDataTableLogic, createTableColumnHelper } from '@rentnerkev/table'

type Member = { id: string; name: string }
const column = createTableColumnHelper<Member>()
const columns = column.columns([column.accessor('name', { header: 'Member' })])

export function useRemoteMembersLogic(
    data: readonly Member[],
    rowCount: number,
) {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
    const [globalFilter, setGlobalFilter] = useState('')

    return useDataTableLogic({
        data,
        columns,
        getRowId: (member) => member.id,
        tableOptions: {
            manualPagination: true,
            manualFiltering: true,
            manualSorting: true,
            rowCount,
            state: { pagination, globalFilter },
            onPaginationChange: setPagination,
            onGlobalFilterChange: setGlobalFilter,
        },
    })
}
```

Connect these controlled values to your application's query hook and pass the query results into the table. For controlled sorting and column filters, add their state and matching callbacks as well. `useDataTableLogic` returns the native `table` alongside `state`, `handler` and `refs` for a custom UI. A controlled state slice needs its corresponding callback; `initialState` only sets uncontrolled defaults.

For an unknown total, use `pageCount: -1`; the footer omits the total page count and disables last-page navigation. Bound next-page navigation from your server response through an application-owned pagination UI when using this mode. `pagination={false}` renders all supplied rows.

## Appearance and messages

`size` accepts `sm`, `md` or `lg`. `DataTable` defaults to striped rows; `striped={false}` disables them. `stickyHeader` sticks within the table viewport; constrain the viewport height through `classNames.viewport` when using a vertically scrolling table.

The table scrolls horizontally inside its viewport at narrow widths. `classNames` exposes `root`, `toolbar`, `viewport`, `table`, `header`, `headerCell`, `row`, `cell` and `footer`. `rowClassName(row)` adds record-specific row classes.

Override shared `--rentner-*` tokens on `:root` or a container. For example:

```css
.light-table {
    --rentner-surface: #ffffff;
    --rentner-control: #edf1f6;
    --rentner-foreground: #0f172a;
    --rentner-muted: #475569;
    --rentner-border: #cbd5e1;
    --rentner-accent: #006d64;
    --rentner-accent-hover: #00564f;
    --rentner-accent-foreground: #ffffff;
    --rentner-success: #047857;
    --rentner-danger: #b91c1c;
}
```

Popup controls use the table root as their default portal container, retaining scoped theme tokens. Pass `portalContainer` explicitly for an application overlay boundary. `TableProvider` is available for custom composition using these controls.

Set `locale="de"` or `locale="en"` and override individual labels or formatter functions through `messages`. Search, filter, visibility and pagination controls use the resolved messages. `searchable`, `columnFilters` and `columnVisibility` can independently hide their controls.

## Loading and errors

`isLoading` displays the loading state and disables built-in controls. `isRefreshing` retains the visible rows and adds a refresh indicator. Custom `toolbarActions` and `bulkActions` remain application-owned; manage their disabled state in your action components.

Use `error={true}` for the translated default error message, a React node for custom content, and `onRetry` for retry behavior. `error={false}` leaves data visible. `emptyState`, `loadingState` and `noResultsState` customize their respective content. Filtered empty results include the active search and column-filter values, with readable select labels and dates, and a reset action. `messages.noResultsFor(summary)` customizes that title; custom `noResultsState` content retains precedence. The separate responsive filter panel remains visible, with `messages.anyDate` available for its date placeholder.

## Rendering and performance

The library is ESM with public subpath exports and server-renderable markup. Interactive consumers need a client boundary in frameworks that distinguish server and client components. Date-filter UI loads lazily; row data remains application-owned.

Pagination bounds rendered rows. Row virtualization, fetching, CSV export, editing, application-record persistence and infinite scrolling are application responsibilities. Table preferences have their own optional storage adapter. For large remote datasets, filter/sort/page on the server and provide a page of rows. Keep `data`, columns and controlled state referentially stable when their contents have not changed.

## Updating from 0.0.2 to 1.0.0

React 19 and Tailwind CSS 4 remain required, and existing public prop names remain available. Resizing now fits the viewport, and built-in filters use a responsive panel below the toolbar instead of header cells; update application CSS that targeted the old filter row. The additive message fields `anyDate` and `noResultsFor` are optional. Resizing, row dragging and persistence remain opt-in. Preference snapshots start at version 1; adapt custom storage responses to that versioned format.

## Styling defaults and visual slots

`TableProvider` supplies shared `classNames` and `headerDividers` defaults to
`DataTable`, `Table` and custom compositions. Local props override the nearest
provider; nested providers inherit unspecified values. An undefined slot inherits,
while an empty string explicitly removes that slot's visual defaults.

Existing container slots (`root`, `toolbar`, `filters`, `viewport`, `table`,
`header`, `headerCell`, `row`, `cell`, `footer`) remain additive for compatibility.
New visual slots **replace** their visual defaults; structural layout, semantic
HTML, event handlers, disabled behavior and keyboard focus remain in place.

| Area            | Visual slots                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared controls | `button`, `buttonActive`                                                                                                                       |
| Toolbar         | `filterButton`, `filterButtonActive`, `filterBadge`, `columnVisibilityButton`, `resetFiltersButton`, `toolbarControls`, `title`, `description` |
| Sorting         | `sortButton`, `sortIcon`, `headerDivider`                                                                                                      |
| Pagination      | `paginationButton`, `paginationIcon`, `paginationNav`, `pageInfo`, `pageSizeSelect`                                                            |
| Details         | `expandButton`, `expandIcon`, `expandedRow`, `expandedCell`, `expandedContent`                                                                 |

A specific control slot takes precedence over `button`. Its active slot takes
precedence over `buttonActive`. Supply a complete visual style for replacement
slots, including desired padding, dimensions, colors and borders.

```tsx
<TableProvider
    headerDividers
    classNames={{
        sortIcon: 'size-4.5 stroke-3 text-rentner-accent',
        filterButtonActive:
            'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-rentner-accent',
    }}
>
    <DataTable data={members} columns={columns} getRowId={(row) => row.id} />
</TableProvider>
```

The filter control uses a neutral active surface with a side accent by default.
Sort indicators are SVG icons, distinct from pagination arrows.
`headerDividers` adds optional decorative separators between column headings.

## Expand from the whole row and handle double clicks

`expandOnRowClick` is opt-in on `DataTable` and `TableSurface`. With
`renderExpandedRow`, clicking text, any ordinary cell or blank row space toggles
details. The detail button remains available for keyboard users. Native controls,
links, editable elements and `data-no-row-click` descendants retain their own
behavior. Expansion respects `getRowCanExpand`, loading state and controlled
`expanded` / `onExpandedChange`.

```tsx
<DataTable
    data={entries}
    columns={columns}
    getRowId={(entry) => entry.id}
    expandOnRowClick
    renderExpandedRow={(row) => <EntryDetails entry={row.original} />}
    onRowDoubleClick={(row, event) => onOpenEntry(row.original, event)}
/>
```

`onRowDoubleClick` and `onCellDoubleClick` already receive typed rows/cells and
the React mouse event. Normal browser ordering applies: a double click includes
two click events, followed by the double-click event. Automatic row expansion
toggles only for the first click in that sequence, preventing an immediate
open/close. Row and cell click handlers run before automatic expansion and can
call `event.preventDefault()` to veto it. Cell handlers run before row handlers;
controls are excluded from row click and double-click callbacks.

## Compact pagination and responsive filters

Page-size options include their unit by default (`10 rows` / `10 Zeilen`). The
`Rows per page` label stays available to assistive technology without taking
space beside the select. Override `messages.pageSizeOption(count)` for a domain
unit, such as products or invoices. Numeric option values, server pagination and
custom page-size lists keep their existing contracts. To show the separate label,
set `classNames.pageSizeLabel` to `not-sr-only`.

Filter layout stays application-defined. Use provider or instance slots
`filterGrid` and `filterField` for the shared layout, and column metadata
`filterClassName` for individual widths or responsive spans. Classes do not
change column widths, filter values, filter types or persistence. Filter
fieldsets expose `data-column-id` for scoped styling and inspection.

```tsx
const columns = column.columns([
    column.accessor('id', {
        header: 'ID',
        meta: { filterClassName: 'w-full sm:w-28 sm:grow-0' },
    }),
    column.accessor('title', {
        header: 'Title',
        meta: { filterClassName: 'w-full sm:min-w-64 sm:flex-1' },
    }),
])

<DataTable
    data={entries}
    columns={columns}
    messages={{ pageSizeOption: (count) => `${count} products` }}
    classNames={{
        filterGrid: 'flex flex-wrap gap-3 p-3',
        filterField: 'm-0 min-w-0 border-0 p-0',
    }}
/>
```

Consumers using Tailwind must include their metadata classes in their normal
source scan. No application-specific IDs, dimensions or business labels are
hardcoded into the package.

# RentnerTable usage

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

Resize a leaf column at its edge. Arrow keys change width by 10 pixels, Shift+Arrow by 50; Home or double-click resets its configured size, and End selects its maximum. `minSize`, `maxSize` and `enableResizing` configure each column. Native `tableOptions.columnResizeMode`, `columnResizeDirection`, controlled `state.columnSizing` and `onColumnSizingChange` remain available on `DataTable`.

Drag a row by its handle, hold the handle briefly on touch devices, or use Space, arrow keys and Space/Enter to move it with the keyboard. Escape and drops outside the table cancel. The preview stays within the visible table width and includes expanded details. Clear sorting before reordering; dragging is disabled while sorting is active or the table is loading or showing an error.

`reorderableRows` alone keeps the order internally. Providing `onRowOrderChange(data, change)` makes the caller responsible for applying the returned array. `TableRowOrderChange` contains `activeId`, `overId`, `fromIndex` and `toIndex`; indices refer to the full supplied data, before filtering and pagination. Only rendered rows are drag targets. Keep stable record IDs, preserve the rest of the data when persisting server-page changes, and retain order in your backend when required. Selection and expanded details stay attached to their record during reordering. Drag dependencies load on demand.

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

Use `error={true}` for the translated default error message, a React node for custom content, and `onRetry` for retry behavior. `error={false}` leaves data visible. `emptyState`, `loadingState` and `noResultsState` customize their respective content. Filtered empty results include a reset action.

## Rendering and performance

The library is ESM with public subpath exports and server-renderable markup. Interactive consumers need a client boundary in frameworks that distinguish server and client components. Date-filter UI loads lazily; row data remains application-owned.

Pagination bounds rendered rows. Row virtualization, fetching, CSV export, editing, persistence and infinite scrolling are application responsibilities. For large remote datasets, filter/sort/page on the server and provide a page of rows. Keep `data`, columns and controlled state referentially stable when their contents have not changed.

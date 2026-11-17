# Integration simplification proposal

Status: design for discussion, not implemented public API. This does not prepare
a new version or authorize a release. Existing imports and props remain valid.

The objective is a direct DataTable import with package-owned table behavior.
Consumers should supply records, columns, identity and domain actions rather
than recreating a table component or repeatedly merging nested option objects.

## 1. Provider defaults

Let TableProvider configure recurring DataTable defaults once: locale, size,
page sizes, search limit, resizing and built-in controls. A per-table value must
override the provider, including explicit false; undefined inherits. Nested
providers should inherit without mutating parent configuration.

Accept a language tag such as de-CH and resolve supported UI messages internally,
so callers do not repeat language-prefix checks. Preserve explicit formatting
locale and time zone where they affect displayed data.

Proposed usage, not current API:

```text
<TableProvider defaults={{ locale: language, size: 'sm', pageSizeOptions: [5, 10, 25, 50, 100] }}>
    <DataTable data={rows} columns={columns} getRowId="id" />
</TableProvider>
```

The identity shortcut should accept only string/number fields and retain the
existing callback form. Invalid identity must fail clearly; never silently use
row positions for selection or persistence.

## 2. Complete column settings over existing persistence

Provide the settings UI for order, visibility, width, save/cancel and reset.
This should reuse native table state and the existing persistence adapter,
field allowlist, write serialization, stale-load protection and controller.
It should not add another storage abstraction beside persistence.

- Edit a local draft; cancellation must neither apply nor save it.
- Apply a confirmed layout atomically and keep at least one valid data column.
- Respect non-hideable and non-resizable columns, removed IDs and newly added IDs.
- Save completed resizing without losing the last change during navigation.
- Expose loading, errors, retry and flush through one native control contract.
- Keep account/table identity explicit and cancel obsolete loads on scope changes.

Authentication, backend endpoints and application-specific storage formats stay
in a small consumer adapter. The package must not know business permissions or
hard-code a server API. The existing snapshot supports the needed layout fields.

## 3. One server-query contract

Offer a typed controlled query containing pagination, sorting, search and column
filters, plus a value callback and row count. A server mode can derive the native
manual flags and merge query state with layout/selection state internally.

The package should own an immediate search draft, configurable debounce, page
reset and cancellation across scope changes. Consumers still own fetching,
authorization, caching, errors and their transport-specific filter encoding.
Keep tableOptions as an escape hatch; avoid competing sources of truth.

Proposed usage, not current API:

```text
<DataTable data={rows} columns={columns} getRowId="id"
    mode="server" query={query} onQueryChange={setQuery} rowCount={total} />
```

## 4. Column presentation and formatting

Small, typed column metadata can replace repeated column transformations:

- Subject/text overflow with an explicit line limit.
- Action columns with sensible width, no sorting/hiding/resizing by default,
  and an explicit override for consumers that need another policy.
- Responsive sizing/scrolling as a supported prop, preserving CSS minimum widths
  without requiring consumers to build a custom CSS variable on every table.
- Reusable date/time and number formatting with cached Intl formatters, explicit
  locale/time zone, null handling and custom cell renderers taking precedence.

Do not cache rendered cells by ignoring changed callbacks or column definitions:
that can retain stale actions and break component state. Renderer hooks must
retain normal React ownership and lifecycle semantics.

## 5. Optional features and performance evidence

Keep optional menus, date pickers and row reordering out of the initial render
path when they are disabled. Report initial loaded JavaScript separately from
all emitted lazy chunks; moving code into a chunk does not remove feature code.

A DnD-generation swap alone is insufficient: a reference consumer can deduplicate
an existing dependency while a standalone consumer becomes larger. Validate both
cases before changing the default dependency graph. A future minimal entry point
or explicit optional-feature API needs a compatibility design before adoption.

Track production bundle bytes, pure row-model CPU, React/DOM work and frame-bound
interaction latency separately. CPU sampling adds overhead and should diagnose
hotspots, not supply final interaction timing. Avoid noisy timing gates in CI;
use functional tests and reproducible, versioned benchmark artifacts.

Recommended order: provider defaults and identity shorthand, complete layout
settings, server-query binding, then presentation/formatting and feature profiles.

import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('keeps the reordered rows when remembering settings is turned off', async ({
    page,
}) => {
    await page.goto('/?remember=1')
    const table = page.getByRole('table')
    const handle = table.getByRole('button', {
        name: 'Move Kevin Sträßler',
        exact: true,
    })
    await expect(handle).toBeEnabled()
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'position 2 of 10',
    )
    await page.keyboard.press('Space')
    await expect(table.locator('tr[data-row-id]').nth(1)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    await page
        .getByRole('button', { name: 'Remember settings', exact: true })
        .click()
    await expect(table.locator('tr[data-row-id]').nth(1)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
})

test('opts in from the playground without changing the default mode', async ({
    page,
}) => {
    await page.goto('/')
    const remember = page.getByRole('button', {
        name: 'Remember settings',
        exact: true,
    })
    await expect(remember).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('separator')).toHaveCount(0)
    await expect(page.locator('[data-row-drag-handle]')).toHaveCount(0)
    await remember.click()
    await expect(page).toHaveURL(/\?remember=1$/)
    await expect(remember).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('separator').first()).toBeVisible()
    await expect(page.locator('[data-row-drag-handle]').first()).toBeVisible()
    await remember.click()
    await expect(page).not.toHaveURL(/remember=1/)
    await page.getByRole('button', { name: 'Deutsch', exact: true }).click()
    await expect(
        page.getByRole('button', { name: 'Einstellungen merken', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false')
})

test('restores filters, sorting, column widths, visibility and page size after real reload', async ({
    page,
}) => {
    await page.goto('/?remember=1')
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const member = page.getByRole('textbox', {
        name: 'Filter Member',
        exact: true,
    })
    await member.fill('Kevin')
    await page
        .getByRole('button', { name: 'Member — Sort ascending', exact: true })
        .click()
    const handle = page.getByRole('separator', {
        name: 'Resize Member',
        exact: true,
    })
    await handle.focus()
    await page.keyboard.press('Shift+ArrowRight')
    const width = await handle.getAttribute('aria-valuenow')
    if (!width) throw new Error('A resized column must report its width')
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page
        .getByRole('menuitemcheckbox', { name: 'Projects', exact: true })
        .click()
    await page.keyboard.press('Escape')
    await page
        .getByRole('combobox', { name: 'Rows per page', exact: true })
        .click()
    await page.getByRole('option', { name: '25', exact: true }).click()
    await page.reload()
    await expect(
        page.getByRole('button', { name: 'Remember settings', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(member).toHaveValue('Kevin')
    await expect(handle).toHaveAttribute('aria-valuenow', width)
    await expect(
        page.locator('thead th[data-column-id="name"]'),
    ).toHaveAttribute('aria-sort', 'ascending')
    await expect(
        page.getByRole('columnheader', { name: /Projects/ }),
    ).toHaveCount(0)
    await expect(
        page.getByRole('combobox', { name: 'Rows per page', exact: true }),
    ).toContainText('25')

    // A suspended debounce cannot save this edit; navigating must flush it.
    await page.clock.install()
    await page.clock.pauseAt(new Date())
    await page
        .getByRole('textbox', { name: 'Search table', exact: true })
        .fill('missing member')
    await page.reload()
    await expect(
        page.getByRole('textbox', { name: 'Search table', exact: true }),
    ).toHaveValue('missing member')
    await expect(page.getByRole('status')).toContainText(
        'Search table: missing member; Member: Kevin',
    )
})

test('restores internal row order, selection, expansion and the current page after real reload', async ({
    page,
}) => {
    await page.goto('/?remember=1')
    const table = page.getByRole('table')
    const row = table.locator('tr[data-row-id="kevin"]')
    await row.getByRole('checkbox').check()
    await row
        .getByRole('button', {
            name: 'Expand details for Kevin Sträßler',
            exact: true,
        })
        .click()
    const handle = row.getByRole('button', {
        name: 'Move Kevin Sträßler',
        exact: true,
    })
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'position 2 of 10',
    )
    await page.keyboard.press('Space')
    await expect(table.locator('tr[data-row-id]').nth(1)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await page.reload()
    await expect(page.getByText('11–20 of 48 entries')).toBeVisible()
    await page
        .getByRole('button', { name: 'Previous page', exact: true })
        .click()
    await expect(table.locator('tr[data-row-id]').nth(1)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    await expect(row.getByRole('checkbox')).toBeChecked()
    await expect(
        row.getByRole('button', {
            name: 'Collapse details for Kevin Sträßler',
            exact: true,
        }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(
        table.locator('tr[data-row-details-for="kevin"]'),
    ).toContainText('Member details')
})

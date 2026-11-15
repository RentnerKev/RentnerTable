import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
})

test('searches and resets results while returning to the first page', async ({
    page,
}) => {
    const table = page.getByRole('table', { name: 'Team overview' })
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect(page.getByText('11–20 of 48 entries')).toBeVisible()
    await page.getByRole('textbox', { name: 'Search table' }).fill('  toni  ')
    await expect(table.locator('tbody tr[data-row-id]')).toHaveCount(9)
    await expect(page.getByText('1–9 of 9 entries')).toBeVisible()
    await page
        .getByRole('textbox', { name: 'Search table' })
        .fill('does not exist')
    await expect(page.getByRole('status')).toContainText('No results found')
    await table
        .getByRole('button', { name: 'Reset filters', exact: true })
        .click()
    await expect(table.locator('tbody tr[data-row-id]')).toHaveCount(10)
    await expect(
        page.getByRole('textbox', { name: 'Search table' }),
    ).toHaveValue('')
})

test('combines column filters and opens the date range filter', async ({
    page,
}) => {
    const table = page.getByRole('table')
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('combobox', { name: 'Filter Role' }).click()
    await page.getByRole('option', { name: 'Designer', exact: true }).click()
    await expect(table.locator('tbody tr[data-row-id]')).toHaveCount(10)
    await expect(
        table.locator('tbody').getByText('Developer', { exact: true }),
    ).toHaveCount(0)
    await page
        .getByRole('textbox', { name: 'Filter Member', exact: true })
        .fill('Alex')
    await expect(page.getByRole('status')).toContainText('No results found')
    await table
        .getByRole('button', { name: 'Reset filters', exact: true })
        .click()
    await page.getByRole('button', { name: /^Filter Joined/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('changes page sizes through the shared select and bounds the last page', async ({
    page,
}) => {
    await page
        .getByRole('combobox', { name: 'Rows per page', exact: true })
        .click()
    await page.getByRole('option', { name: '25', exact: true }).click()
    await expect(
        page.getByRole('table').locator('tbody tr[data-row-id]'),
    ).toHaveCount(25)
    await expect(page.getByText('1–25 of 48 entries')).toBeVisible()
    await page.getByRole('button', { name: 'Last page', exact: true }).click()
    await expect(
        page.getByRole('table').locator('tbody tr[data-row-id]'),
    ).toHaveCount(23)
    await expect(
        page.getByRole('button', { name: 'Next page', exact: true }),
    ).toBeDisabled()
})

test('runs a bulk action and expands details from the row action menu', async ({
    page,
}) => {
    const table = page.getByRole('table')
    const row = table.locator('tbody tr[data-row-id="toni"]')
    await row
        .getByRole('checkbox', { name: 'Select Toni Bauer', exact: true })
        .check()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await page
        .getByRole('button', { name: 'Activate selected', exact: true })
        .click()
    await expect(row.getByText('Active', { exact: true })).toBeVisible()
    await expect(page.getByText('1 selected', { exact: true })).toHaveCount(0)
    await row
        .getByRole('button', { name: 'Actions: Toni Bauer', exact: true })
        .click()
    await page
        .getByRole('menuitem', { name: 'View details', exact: true })
        .click()
    await expect(
        table.getByText('Member details', { exact: true }),
    ).toBeVisible()
    await expect(
        row.getByRole('button', {
            name: 'Collapse details for Toni Bauer',
            exact: true,
        }),
    ).toHaveAttribute('aria-expanded', 'true')
})

test('hides columns and preserves the theme inside popup controls', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await expect(page.getByRole('menu')).toHaveCSS('color', 'rgb(23, 32, 43)')
    await page
        .getByRole('menuitemcheckbox', { name: 'Projects', exact: true })
        .click()
    await page.keyboard.press('Escape')
    await expect(
        page.getByRole('columnheader', { name: /Projects/ }),
    ).toHaveCount(0)
    await page
        .getByRole('combobox', { name: 'Rows per page', exact: true })
        .click()
    await expect(page.getByRole('listbox')).toHaveCSS(
        'color',
        'rgb(23, 32, 43)',
    )
})

test('recovers from an error and updates the reusable table with new data', async ({
    page,
}) => {
    await page.getByRole('button', { name: 'Error state', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText(
        'The team could not be loaded',
    )
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(
        page.getByRole('table').locator('tbody tr[data-row-id]'),
    ).toHaveCount(10)
    await page.getByRole('button', { name: 'Add member', exact: true }).click()
    await expect(
        page.getByRole('table').getByText('New member 49', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('1–10 of 49 entries')).toBeVisible()
})

import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
})

test('sorts from the keyboard and retains native table semantics', async ({
    page,
}) => {
    const table = page.getByRole('table', { name: 'Team overview' })
    const member = table.getByRole('button', { name: /Member/ })
    await member.focus()
    await page.keyboard.press('Enter')
    await expect(table.locator('tbody tr').first()).toContainText('Alex Weber')
    await expect(
        table.getByRole('columnheader', { name: /Member/ }),
    ).toHaveAttribute('aria-sort', 'ascending')
    await page.keyboard.press('Space')
    await expect(table.locator('tbody tr').first()).toContainText('Toni Bauer')
    await expect(member).toBeFocused()
})

test('switches empty/loading states and translations', async ({ page }) => {
    await page.getByRole('button', { name: 'Empty state', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('No entries found.')
    await page
        .getByRole('button', { name: 'Loading state', exact: true })
        .click()
    await expect(page.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByRole('status')).toHaveText('Loading entries …')
    await page.getByRole('button', { name: 'Deutsch', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.getByRole('status')).toHaveText(
        'Einträge werden geladen …',
    )
})

test('keeps tables scrollable within a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.getByRole('table')).toBeVisible()
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        scroll:
            document.querySelector('[data-rentner-table-container]')
                ?.scrollWidth ?? 0,
        container:
            document.querySelector('[data-rentner-table-container]')
                ?.clientWidth ?? 0,
    }))
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.scroll).toBeGreaterThan(dimensions.container)
})

test('supports density and shared theme overrides without accessibility violations', async ({
    page,
}) => {
    const table = page.getByRole('table')
    await page.getByRole('button', { name: 'Compact', exact: true }).click()
    await expect(table).toHaveAttribute('data-size', 'sm')
    await expect(table).toHaveAttribute('data-striped', 'true')
    await page
        .getByRole('button', { name: 'Striped rows', exact: true })
        .click()
    await expect(table).toHaveAttribute('data-striped', 'false')
    expect(
        (await new AxeBuilder({ page }).analyze()).violations.map(
            ({ id, nodes }) => ({
                id,
                targets: nodes.map(({ target }) => target),
            }),
        ),
    ).toEqual([])
    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    await expect(table).toHaveCSS('color', 'rgb(23, 32, 43)')
    expect(
        (await new AxeBuilder({ page }).analyze()).violations.map(
            ({ id, nodes }) => ({
                id,
                targets: nodes.map(({ target }) => target),
            }),
        ),
    ).toEqual([])
})

import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
})

test('expands from row content, keeps controls independent and handles native double clicks', async ({
    page,
}) => {
    const row = page.locator('tr[data-row-id="kevin"]')
    const details = page.locator('tr[data-row-details-for="kevin"]')
    const name = row.getByText('Kevin Sträßler', { exact: true })
    await name.click()
    await expect(details).toBeVisible()
    await row.getByRole('checkbox').check()
    await expect(details).toBeVisible()
    await name.click()
    await expect(details).toHaveCount(0)
    await name.dblclick()
    await expect(details).toBeVisible()
    await expect(page.locator('[data-row-event]')).toContainText(
        'Double-clicked: Kevin Sträßler',
    )
    await row
        .getByRole('button', {
            name: 'Collapse details for Kevin Sträßler',
            exact: true,
        })
        .click()
    await expect(details).toHaveCount(0)
})

test('shows compact strong sort icons, header dividers and a side marker on the filter control', async ({
    page,
}) => {
    const sort = page.locator(
        'th[data-column-id="name"] [data-table-sort-icon]',
    )
    await expect(sort).toHaveCSS('width', '18px')
    await expect(sort).toHaveCSS('stroke-width', '3px')
    await expect(
        page.locator('[data-table-header-divider]').first(),
    ).toBeVisible()
    const filter = page.getByRole('button', { name: 'Filters', exact: true })
    await expect(filter).toHaveCSS('cursor', 'pointer')
    await filter.click()
    await expect(filter).toHaveAttribute('data-active', 'true')
    const marker = await filter.evaluate((button) => ({
        width: getComputedStyle(button, '::before').width,
        background: getComputedStyle(button, '::before').backgroundColor,
    }))
    expect(marker.width).toBe('2px')
    expect(marker.background).not.toBe('rgba(0, 0, 0, 0)')
})

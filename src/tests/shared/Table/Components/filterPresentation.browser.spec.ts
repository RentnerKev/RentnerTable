import { expect, test } from '@playwright/test'

test('wraps long filter values inside the fitted table without losing the query', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.goto('/')
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const query = 'x'.repeat(200)
    await page
        .getByRole('textbox', { name: 'Filter Member', exact: true })
        .fill(query)
    const status = page.getByRole('status')
    await expect(status).toContainText(`Member: ${query}`)
    const bounds = await status.boundingBox()
    const table = await page.getByRole('table').boundingBox()
    if (!bounds || !table)
        throw new Error('Table and filter context must have geometry')
    expect(bounds.x).toBeGreaterThanOrEqual(table.x)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        table.x + table.width + 1,
    )
    expect(
        await page.getByRole('table').evaluate((element) => {
            const viewport = element.parentElement
            return (
                viewport !== null &&
                viewport.scrollWidth <= viewport.clientWidth + 1
            )
        }),
    ).toBe(true)
})

test('aligns shared filters and keeps the active query visible with no results', async ({
    page,
}) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    const member = page.getByRole('textbox', {
        name: 'Filter Member',
        exact: true,
    })
    const joined = page.getByRole('button', {
        name: /^Filter Joined:/,
    })
    await expect(member).toHaveCSS('border-top-left-radius', '12px')
    await expect(joined).toHaveCSS('text-align', 'left')
    await expect(joined).toContainText('Any date')
    await member.fill('test')
    await expect(page.getByRole('status')).toContainText(
        'No results found for Member: test',
    )
    await expect(member).toHaveValue('test')
    await expect(
        page.getByRole('region', { name: 'Filters', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
})

test('localizes the date placeholder and empty search context in German', async ({
    page,
}) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Deutsch', exact: true }).click()
    await page.getByRole('button', { name: 'Filter', exact: true }).click()
    await expect(
        page.getByRole('button', { name: /^Beigetreten filtern:/ }),
    ).toContainText('Beliebiges Datum')
    await page
        .getByRole('textbox', { name: 'Mitglied filtern', exact: true })
        .fill('test')
    await page
        .getByRole('textbox', { name: 'Tabelle durchsuchen', exact: true })
        .fill('unbekannt')
    await expect(page.getByRole('status')).toContainText(
        'Keine Ergebnisse gefunden für Tabelle durchsuchen: unbekannt; Mitglied: test',
    )
})

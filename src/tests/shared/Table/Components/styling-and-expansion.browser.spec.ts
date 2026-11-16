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

test('centers a longer resize marker and keeps host focus outlines off the drag area', async ({
    page,
}) => {
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    await page.addStyleTag({
        content:
            ':focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }',
    })
    const handle = page.getByRole('separator', {
        name: 'Resize Member',
        exact: true,
    })
    await handle.focus()
    await expect(handle).toHaveCSS('outline-style', 'none')
    await expect(handle).toHaveCSS('filter', 'none')
    await expect(handle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const geometry = await handle.evaluate((element) => {
        const divider = element.parentElement?.querySelector(
            '[data-table-header-divider]',
        )
        if (!divider) throw new Error('Missing header divider')
        const gripBox = element.getBoundingClientRect()
        const lineBox = divider.getBoundingClientRect()
        return {
            handleHeight: gripBox.height,
            lineHeight: lineBox.height,
            centerXDifference: Math.abs(
                gripBox.right - 1.5 - (lineBox.left + lineBox.width / 2),
            ),
            centerYDifference: Math.abs(
                gripBox.top +
                    gripBox.height / 2 -
                    (lineBox.top + lineBox.height / 2),
            ),
            backgroundSize: getComputedStyle(element).backgroundSize,
            backgroundImage: getComputedStyle(element).backgroundImage,
        }
    })
    expect(
        Math.abs(geometry.lineHeight - (geometry.handleHeight - 16)),
    ).toBeLessThanOrEqual(1)
    expect(geometry.centerXDifference).toBeLessThanOrEqual(0.25)
    expect(geometry.centerYDifference).toBeLessThanOrEqual(0.5)
    expect(geometry.backgroundSize).toMatch(/^3px /)
    expect(geometry.backgroundImage).toContain('linear-gradient')
    const previous = Number(await handle.getAttribute('aria-valuenow'))
    await handle.press('ArrowRight')
    expect(Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(
        previous,
    )
})

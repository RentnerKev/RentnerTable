import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
})

test('resizes columns in both directions without sorting, and supports keyboard reset', async ({
    page,
}) => {
    await expect(page.getByRole('separator')).toHaveCount(0)
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    const table = page.getByRole('table')
    const header = table.locator('thead th[data-column-id="name"]')
    const handle = page.getByRole('separator', {
        name: 'Resize Member',
        exact: true,
    })
    await handle.click({ button: 'right' })
    await expect(handle).not.toHaveAttribute('data-resizing')
    await page.keyboard.press('Escape')
    const initial = await header.evaluate(
        (el) => el.getBoundingClientRect().width,
    )
    const point = await handle.boundingBox()
    if (!point) throw new Error('The resize handle must have geometry')
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2)
    await page.mouse.down()
    await page.mouse.move(
        point.x + point.width / 2 + 90,
        point.y + point.height / 2,
        { steps: 8 },
    )
    await page.mouse.up()
    await expect
        .poll(() => header.evaluate((el) => el.getBoundingClientRect().width))
        .toBeGreaterThan(initial + 80)
    await expect(header).not.toHaveAttribute('aria-sort')
    const wider = await header.evaluate(
        (el) => el.getBoundingClientRect().width,
    )
    const widerPoint = await handle.boundingBox()
    if (!widerPoint) throw new Error('The moved handle must have geometry')
    await page.mouse.move(
        widerPoint.x + widerPoint.width / 2,
        widerPoint.y + widerPoint.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
        widerPoint.x + widerPoint.width / 2 - 55,
        widerPoint.y + widerPoint.height / 2,
        { steps: 8 },
    )
    await page.mouse.up()
    await expect
        .poll(() => header.evaluate((el) => el.getBoundingClientRect().width))
        .toBeLessThan(wider - 45)
    await handle.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect
        .poll(() => header.evaluate((el) => el.getBoundingClientRect().width))
        .toBeGreaterThan(wider - 15)
    await page.keyboard.press('Home')
    await expect(handle).toHaveAttribute('aria-valuenow', '150')
    await expect(header).not.toHaveAttribute('aria-sort')
})

test('reorders rows with a full preview and moves expanded details and selection with the record', async ({
    page,
}) => {
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
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
    await expect(handle).toBeEnabled()
    const from = await handle.boundingBox()
    const destination = await table
        .locator('tr[data-row-id="sam"]')
        .boundingBox()
    if (!from || !destination)
        throw new Error('The drag source and target must have geometry')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(
        from.x + from.width / 2 + 40,
        destination.y + destination.height / 2,
        { steps: 15 },
    )
    const preview = page.locator('[data-rentner-row-preview]')
    await expect(preview).toBeVisible()
    await expect(preview).toHaveAttribute('inert', '')
    await expect(preview.locator('tr[data-row-id="kevin"]')).toContainText(
        'Kevin Sträßler',
    )
    await expect(
        preview.locator('tr[data-row-details-for="kevin"]'),
    ).toContainText('Member details')
    const previewBounds = await preview.boundingBox()
    const tableBounds = await table.boundingBox()
    expect(previewBounds?.x).toBeCloseTo(tableBounds?.x ?? 0, 0)
    expect(previewBounds?.width).toBeLessThanOrEqual(
        await table.evaluate((el) => el.parentElement?.clientWidth ?? 0),
    )
    await page.mouse.up()
    await expect(table.locator('tr[data-row-id]').first()).toHaveAttribute(
        'data-row-id',
        'alex',
    )
    await expect(table.locator('tr[data-row-id]').nth(2)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    await expect(row.getByRole('checkbox')).toBeChecked()
    await expect(
        table.locator('tbody[data-sortable-row="kevin"] > tr'),
    ).toHaveCount(2)
    await expect(preview).toHaveCount(0)
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
})

test('supports keyboard dragging, cancellation, focus restoration and sorted-table guards', async ({
    page,
}) => {
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    const table = page.getByRole('table')
    const handle = table.getByRole('button', {
        name: 'Move Kevin Sträßler',
        exact: true,
    })
    await expect(handle).toBeEnabled()
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'position 2 of 10',
    )
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(table.locator('tr[data-row-id]').first()).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    await expect(handle).toBeFocused()
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
    await expect(handle).toBeFocused()
    await table
        .getByRole('button', { name: 'Member — Sort ascending', exact: true })
        .click()
    await expect(table.locator('[data-row-drag-handle]').first()).toBeDisabled()
    await expect(
        table.locator('[data-row-drag-handle]').first(),
    ).toHaveAttribute('title', /sort/i)
})

test('cancels drops outside the table and reorders only the active page', async ({
    page,
}) => {
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    const table = page.getByRole('table')
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    const first = table.locator('tr[data-row-id]').first()
    const firstId = await first.getAttribute('data-row-id')
    const handle = first.locator('[data-row-drag-handle]')
    await expect(handle).toBeEnabled()
    await handle.scrollIntoViewIfNeeded()
    const point = await handle.boundingBox()
    if (!point) throw new Error('The row handle must have geometry')
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2)
    await page.mouse.down()
    await page.mouse.move(5, 100, { steps: 10 })
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    await page.mouse.up()
    await expect(page.locator('[data-rentner-row-preview]')).toHaveCount(0)
    await expect(first).toHaveAttribute('data-row-id', firstId ?? '')
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
        firstId ?? '',
    )
    await expect(page.getByText('11–20 of 48 entries')).toBeVisible()
    await page.getByRole('button', { name: 'First page', exact: true }).click()
    await expect(table.locator('tr[data-row-id]').first()).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
})

test('edits status through the shared menu and exposes row and table context menus', async ({
    page,
}) => {
    const table = page.getByRole('table')
    const row = table.locator('tr[data-row-id="toni"]')
    await row.locator('td[data-column-id="name"]').click()
    await expect(page.locator('[data-row-event]')).toHaveText(
        'Clicked: Toni Bauer',
    )
    await row
        .getByRole('button', { name: /^Change status: Toni Bauer — / })
        .click()
    await page
        .getByRole('menuitemradio', { name: 'Active', exact: true })
        .click()
    await expect(row.getByText('Active', { exact: true })).toBeVisible()
    await expect(page.locator('[data-row-event]')).toHaveText(
        'Clicked: Toni Bauer',
    )
    await row.locator('td[data-column-id="role"]').click({ button: 'right' })
    await expect(
        page.getByRole('menu', { name: 'Table context menu' }),
    ).toBeVisible()
    await expect(page.locator('[data-row-event]')).toHaveText(
        'Right-clicked: Toni Bauer',
    )
    await page
        .getByRole('menuitem', { name: 'View details', exact: true })
        .click()
    await expect(table.locator('tr[data-row-details-for="toni"]')).toBeVisible()
    await table
        .locator('thead th[data-column-id="name"]')
        .click({ button: 'right' })
    await expect(
        page.getByRole('menuitem', { name: 'Add member', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Light theme', exact: true }).click()
    await row
        .getByRole('button', { name: /^Change status: Toni Bauer — / })
        .click()
    await expect(page.getByRole('menu')).toHaveCSS('color', 'rgb(23, 32, 43)')
})

test('keeps narrow layouts inside the viewport while columns and row controls remain usable', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    const table = page.getByRole('table')
    const handle = table.getByRole('button', {
        name: 'Move Kevin Sträßler',
        exact: true,
    })
    await expect(handle).toBeEnabled()
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
    await handle.scrollIntoViewIfNeeded()
    await handle.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-rentner-row-preview]')).toBeVisible()
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
    const previewBounds = await page
        .locator('[data-rentner-row-preview]')
        .boundingBox()
    expect(previewBounds?.width).toBeLessThanOrEqual(
        await table.evaluate((el) => el.parentElement?.clientWidth ?? 0),
    )
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('[id^="DndLiveRegion"]')).toContainText(
        'position 2 of 10',
    )
    await page.keyboard.press('Space')
    await expect(table.locator('tr[data-row-id]').nth(1)).toHaveAttribute(
        'data-row-id',
        'kevin',
    )
    const status = table
        .locator('tr[data-row-id="kevin"]')
        .getByRole('button', {
            name: /^Change status: Kevin Sträßler — /,
        })
    await status.click()
    await expect(
        page.getByRole('menuitemradio', { name: 'Inactive', exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
})

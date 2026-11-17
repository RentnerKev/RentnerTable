import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?column-settings=1&remember=1')
    await expect(page.locator('[data-rentner-data-table]')).toBeVisible()
})

test('edits an isolated draft, cancels with Escape and restores trigger focus', async ({
    page,
}) => {
    const table = page.locator('[data-rentner-data-table]')
    const headers = table.locator('th[data-column-id]')
    const initial = await headers.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-column-id')),
    )
    const trigger = page.getByRole('button', {
        name: 'Column settings',
        exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Column settings' })
    await expect(dialog).toBeVisible()
    await dialog
        .getByRole('button', { name: 'Move Role earlier', exact: true })
        .click()
    await dialog
        .getByRole('checkbox', { name: 'Visible: Role', exact: true })
        .uncheck()
    await dialog
        .getByRole('spinbutton', {
            name: 'Width in pixels: Member',
            exact: true,
        })
        .fill('260')
    expect(
        await headers.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute('data-column-id')),
        ),
    ).toEqual(initial)
    await dialog.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    expect(
        await headers.evaluateAll((elements) =>
            elements.map((element) => element.getAttribute('data-column-id')),
        ),
    ).toEqual(initial)
    await trigger.click()
    await expect(
        dialog.getByRole('checkbox', { name: 'Visible: Role', exact: true }),
    ).toBeChecked()
})

test('applies order, visibility and width together and restores the saved layout after reload', async ({
    page,
}) => {
    const trigger = page.getByRole('button', {
        name: 'Column settings',
        exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Column settings' })
    await dialog
        .getByRole('button', { name: 'Move Role earlier', exact: true })
        .click()
    await dialog
        .getByRole('checkbox', { name: 'Visible: Role', exact: true })
        .uncheck()
    await dialog
        .getByRole('spinbutton', {
            name: 'Width in pixels: Member',
            exact: true,
        })
        .fill('260')
    await dialog
        .getByRole('button', { name: 'Apply layout', exact: true })
        .click()
    await expect(dialog).not.toBeVisible()
    await expect(
        page.locator('[data-rentner-data-table] th[data-column-id="role"]'),
    ).toHaveCount(0)
    await expect
        .poll(() =>
            page.evaluate(() => {
                const saved = localStorage.getItem(
                    'rentner-table:playground:team',
                )
                return saved ? JSON.parse(saved).state : null
            }),
        )
        .toMatchObject({
            columnOrder: [
                'role',
                'name',
                'projects',
                'status',
                'createdAt',
                'actions',
            ],
            columnVisibility: { role: false },
            columnSizing: { name: 260 },
        })
    await page.reload()
    await trigger.click()
    await expect(
        dialog.getByRole('checkbox', { name: 'Visible: Role', exact: true }),
    ).not.toBeChecked()
    await expect(
        dialog.getByRole('spinbutton', {
            name: 'Width in pixels: Member',
            exact: true,
        }),
    ).toHaveValue('260')
    await expect(
        dialog.locator('[data-table-column-setting]').first(),
    ).toHaveAttribute('data-table-column-setting', 'role')
})

test('reset stays in the draft, fixed columns stay protected, and invalid widths block confirmation', async ({
    page,
}) => {
    await page
        .getByRole('button', { name: 'Column settings', exact: true })
        .click()
    const dialog = page.getByRole('dialog', { name: 'Column settings' })
    const width = dialog.getByRole('spinbutton', {
        name: 'Width in pixels: Member',
        exact: true,
    })
    const original = await width.inputValue()
    await expect(
        dialog.getByRole('checkbox', { name: 'Visible: Member', exact: true }),
    ).toBeDisabled()
    await width.fill('')
    await expect(
        dialog.getByRole('button', { name: 'Apply layout', exact: true }),
    ).toBeDisabled()
    await expect(width).toHaveAttribute('aria-invalid', 'true')
    await dialog
        .getByRole('button', { name: 'Reset layout', exact: true })
        .click()
    await expect(width).toHaveValue(original)
    await expect(
        dialog.getByRole('button', { name: 'Apply layout', exact: true }),
    ).toBeEnabled()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).not.toBeVisible()
})

test('is keyboard accessible in a narrow viewport with no serious accessibility violations', async ({
    page,
}) => {
    await page.setViewportSize({ width: 360, height: 640 })
    const trigger = page.getByRole('button', {
        name: 'Column settings',
        exact: true,
    })
    await trigger.focus()
    await trigger.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Column settings' })
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.width).toBeLessThanOrEqual(360)
    const audit = await new AxeBuilder({ page }).include('dialog').analyze()
    expect(
        audit.violations.filter(
            (item) => item.impact === 'serious' || item.impact === 'critical',
        ),
    ).toEqual([])
    await dialog.press('Escape')
    await expect(trigger).toBeFocused()
})

test('editing a width with Enter never submits the surrounding application form', async ({
    page,
}) => {
    await page.evaluate(() => {
        const table = document.querySelector('[data-rentner-data-table]')
        if (!table?.parentElement) throw new Error('Missing table')
        const form = document.createElement('form')
        form.id = 'application-form'
        form.dataset.submissions = '0'
        const submit = document.createElement('button')
        submit.type = 'submit'
        submit.textContent = 'Save application'
        table.parentElement.insertBefore(form, table)
        form.append(table, submit)
        form.addEventListener('submit', (event) => {
            event.preventDefault()
            form.dataset.submissions = String(
                Number(form.dataset.submissions) + 1,
            )
        })
    })
    await page
        .getByRole('button', { name: 'Column settings', exact: true })
        .click()
    const dialog = page.getByRole('dialog', { name: 'Column settings' })
    await dialog
        .getByRole('spinbutton', {
            name: 'Width in pixels: Member',
            exact: true,
        })
        .press('Enter')
    await expect(dialog).toBeVisible()
    await expect(page.locator('#application-form')).toHaveAttribute(
        'data-submissions',
        '0',
    )
    await dialog
        .getByRole('button', { name: 'Apply layout', exact: true })
        .press('Enter')
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('#application-form')).toHaveAttribute(
        'data-submissions',
        '0',
    )
})

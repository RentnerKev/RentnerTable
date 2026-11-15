import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function expectFitted(page: Page) {
    const table = page.getByRole('table')
    await expect
        .poll(() =>
            table.evaluate((element) => {
                const viewport = element.parentElement
                return viewport
                    ? Math.max(
                          element.getBoundingClientRect().width -
                              viewport.clientWidth,
                          viewport.scrollWidth - viewport.clientWidth,
                      )
                    : Infinity
            }),
        )
        .toBeLessThanOrEqual(1)
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    ).toBe(true)
}

async function drag(page: Page, handle: Locator, distance: number) {
    const box = await handle.boundingBox()
    if (!box) throw new Error('The resize handle must have geometry')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(
        Math.min(x + distance, (page.viewportSize()?.width ?? 1440) - 5),
        y,
        { steps: 8 },
    )
    await expectFitted(page)
    await page.mouse.up()
}

test('clamps mouse and keyboard resizing and keeps fitted widths after viewport and utility changes', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.goto('/')
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    const handle = page.getByRole('separator', {
        name: 'Resize Member',
        exact: true,
    })
    const initial = Number(await handle.getAttribute('aria-valuenow'))
    await drag(page, handle, 1500)
    expect(Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(
        initial,
    )
    await expectFitted(page)
    await handle.focus()
    await page.keyboard.press('End')
    const maximum = Number(await handle.getAttribute('aria-valuemax'))
    expect(Number(await handle.getAttribute('aria-valuenow'))).toBeCloseTo(
        maximum,
        0,
    )
    await page.keyboard.press('Shift+ArrowRight')
    expect(Number(await handle.getAttribute('aria-valuenow'))).toBeCloseTo(
        maximum,
        0,
    )
    await expectFitted(page)
    await page.keyboard.press('Home')
    await expectFitted(page)
    await page
        .getByRole('button', { name: 'Reorder rows', exact: true })
        .click()
    await expectFitted(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await expectFitted(page)
    await handle.focus()
    await page.keyboard.press('End')
    await expectFitted(page)
    await page.setViewportSize({ width: 320, height: 844 })
    await expectFitted(page)
    await page.setViewportSize({ width: 1440, height: 1200 })
    await expectFitted(page)
})

test('clamps touch drags and cleans up touch cancellation', async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1200 })
    await page.goto('/')
    await page
        .getByRole('button', { name: 'Resize columns', exact: true })
        .click()
    const handle = page.getByRole('separator', {
        name: 'Resize Member',
        exact: true,
    })
    await handle.evaluate((element) => {
        const start = new Event('touchstart', {
            bubbles: true,
            cancelable: true,
        })
        Object.defineProperty(start, 'touches', { value: [{ clientX: 100 }] })
        element.dispatchEvent(start)
    })
    await expect(handle).toHaveAttribute('data-resizing', 'true')
    await page.evaluate(() => {
        const move = new Event('touchmove', { bubbles: true, cancelable: true })
        Object.defineProperty(move, 'touches', { value: [{ clientX: 2000 }] })
        document.dispatchEvent(move)
    })
    await expectFitted(page)
    await page.evaluate(() => document.dispatchEvent(new Event('touchcancel')))
    await expect(handle).not.toHaveAttribute('data-resizing')
    const stopped = await handle.getAttribute('aria-valuenow')
    await page.evaluate(() => {
        const move = new Event('touchmove', { bubbles: true, cancelable: true })
        Object.defineProperty(move, 'touches', { value: [{ clientX: 0 }] })
        document.dispatchEvent(move)
    })
    await expect(handle).toHaveAttribute('aria-valuenow', stopped ?? '')
    await expectFitted(page)
})
